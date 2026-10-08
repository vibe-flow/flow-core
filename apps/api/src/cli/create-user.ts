/**
 * Crée un compte, ou remplace son mot de passe s'il existe déjà.
 * C'est la porte d'entrée du premier administrateur quand l'inscription est fermée.
 *
 * Le mot de passe se lit sur l'entrée standard, jamais en argument (il finirait
 * dans l'historique du shell et la liste des processus).
 *
 *   en local :     echo -n '<mot de passe>' | bunx tsx apps/api/src/cli/create-user.ts <email> [ADMIN|USER]
 *   en production : … | ssh flow docker exec -i <service>-api node dist/cli/create-user.js <email>
 *
 * En mode `magic-link` le mot de passe ne sert pas : le compte se connecte par lien.
 */
import { PrismaClient } from '@prisma/client'
import { AUTH } from '@template-dev/shared'
import { auth } from '../lib/auth'

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks)
    .toString('utf8')
    .replace(/\r?\n$/, '')
}

async function main() {
  const [email, role = 'ADMIN'] = process.argv.slice(2)
  if (!email) {
    console.error('usage : create-user <email> [ADMIN|USER]  (mot de passe sur l’entrée standard)')
    process.exit(1)
  }
  const password = await readStdin()
  if (password.length < AUTH.minPasswordLength) {
    console.error(`Le mot de passe doit faire au moins ${AUTH.minPasswordLength} caractères`)
    process.exit(1)
  }

  const prisma = new PrismaClient()
  try {
    const ctx = await auth.$context
    const hash = await ctx.password.hash(password)

    const user = await prisma.user.upsert({
      where: { email },
      update: { status: 'ACTIVE' },
      create: {
        email,
        name: email.split('@')[0],
        role: role === 'USER' ? 'USER' : 'ADMIN',
        emailVerified: true,
      },
    })

    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    })
    if (account) {
      await prisma.account.update({ where: { id: account.id }, data: { password: hash } })
      // Un mot de passe remplacé ferme les sessions ouvertes.
      await prisma.session.deleteMany({ where: { userId: user.id } })
      console.warn(`Mot de passe remplacé pour ${email}, sessions fermées`)
    } else {
      await prisma.account.create({
        data: { userId: user.id, providerId: 'credential', accountId: user.id, password: hash },
      })
      console.warn(`Compte créé : ${email} (${user.role})`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

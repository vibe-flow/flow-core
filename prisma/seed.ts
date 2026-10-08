import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Comptes de développement, sans mot de passe : on y entre par la connexion en un clic de
// l'écran de connexion (active quand NODE_ENV=development). Pour un mot de passe :
// apps/api/src/cli/create-user.ts.
async function main() {
  console.log('Seeding database...')

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  })

  console.log('Created admin user:', admin.email)

  // Create regular user
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Regular User',
      role: 'USER',
      status: 'ACTIVE',
      emailVerified: true,
    },
  })

  console.log('Created regular user:', user.email)

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

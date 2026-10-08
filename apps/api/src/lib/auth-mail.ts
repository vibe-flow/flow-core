import * as nodemailer from 'nodemailer'
import { APP_NAME } from '@template-dev/shared'

export type AuthMailKind = 'verification' | 'reset' | 'invitation' | 'magic-link'

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST ?? 'localhost',
  port: parseInt(process.env.MAIL_PORT ?? '1025', 10),
  ...(process.env.MAIL_USER && process.env.MAIL_PASS
    ? { auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } }
    : {}),
})

const from = process.env.MAIL_FROM ?? 'noreply@localhost'

const CONTENT: Record<
  AuthMailKind,
  { subject: string; intro: string; cta: string; outro: string }
> = {
  verification: {
    subject: 'Confirmez votre adresse e-mail',
    intro: `Bienvenue sur ${APP_NAME}. Confirmez votre adresse e-mail pour activer votre compte.`,
    cta: 'Confirmer mon adresse',
    outro: "Si vous n'avez pas créé de compte, ignorez simplement ce message.",
  },
  reset: {
    subject: 'Choisissez un nouveau mot de passe',
    intro: `Vous avez demandé à réinitialiser votre mot de passe ${APP_NAME}.`,
    cta: 'Choisir un nouveau mot de passe',
    outro:
      "Ce lien expire dans une heure. Une fois le nouveau mot de passe choisi, toutes vos sessions ouvertes sont fermées. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.",
  },
  invitation: {
    subject: `Votre accès à ${APP_NAME}`,
    intro: `Un accès à ${APP_NAME} vient de vous être ouvert. Choisissez votre mot de passe pour l'activer.`,
    cta: 'Créer mon mot de passe',
    outro:
      'Ce lien est personnel. Passé son délai de validité, utilisez « Mot de passe oublié » sur la page de connexion.',
  },
  'magic-link': {
    subject: 'Votre lien de connexion',
    intro: `Cliquez sur le bouton ci-dessous pour vous connecter à ${APP_NAME}.`,
    cta: 'Me connecter',
    outro:
      "Ce lien est personnel, à usage unique, et expire dans 15 minutes. Si vous n'avez pas demandé à vous connecter, ignorez ce message.",
  },
}

// Bouton en tableau : Outlook ignore padding et fond posés sur un <a>.
function render(kind: AuthMailKind, url: string): string {
  const c = CONTENT[kind]
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${c.subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;">
        <tr><td style="background:#18181b;border-radius:12px 12px 0 0;padding:20px 28px;color:#ffffff;font-size:18px;font-weight:bold;">${APP_NAME}</td></tr>
        <tr><td style="padding:28px;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 24px;">${c.intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td bgcolor="#18181b" style="border-radius:8px;padding:12px 24px;">
              <a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:bold;">${c.cta}</a>
            </td>
          </tr></table>
          <p style="margin:24px 0 0;font-size:13px;color:#71717a;">${c.outro}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** Le seul point d'envoi des e-mails d'authentification. */
export async function sendAuthMail(to: string, kind: AuthMailKind, url: string): Promise<void> {
  await transporter.sendMail({ from, to, subject: CONTENT[kind].subject, html: render(kind, url) })
}

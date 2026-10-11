import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from './logger.js'

export interface OutgoingEmail {
  to: string
  subject: string
  text: string
}

const recent: OutgoingEmail[] = []

/** Last emails accepted by this process. Tests read this; production does not rely on it. */
export function recentEmails() {
  return recent
}

function remember(message: OutgoingEmail) {
  if (env.NODE_ENV === 'production') return
  recent.push(message)
  if (recent.length > 30) recent.shift()
}

/** Sends through SMTP when configured (Mailpit locally). Otherwise the message is logged. */
export async function sendMail(message: OutgoingEmail): Promise<'sent' | 'logged'> {
  remember(message)
  if (!env.SMTP_HOST) {
    logger.info({ to: message.to, subject: message.subject, text: message.text }, 'email logged')
    return 'logged'
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
  })
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
  })
  return 'sent'
}

export function portalLink(path: string) {
  return `${env.PORTAL_ORIGIN.replace(/\/$/, '')}${path}`
}

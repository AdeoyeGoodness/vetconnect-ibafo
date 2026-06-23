import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.user) {
    // No SMTP configured — fall back to a JSON transport that logs instead of sending.
    transporter = nodemailer.createTransport({ jsonTransport: true });
  } else {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

/**
 * Send an email AND record it in the notifications log.
 * @param {{ to:string, userId?:string, subject:string, html?:string, text?:string, payload?:object }} opts
 */
export async function sendEmail({ to, userId, subject, html, text, payload = {} }) {
  const t = getTransporter();
  let status = 'SENT';
  let error = null;
  try {
    await t.sendMail({ from: env.smtp.from, to, subject, html, text });
  } catch (err) {
    status = 'FAILED';
    error = err.message;
    console.error('[mailer] send failed:', err.message);
  }
  try {
    await query(
      `INSERT INTO notifications (user_id, channel, subject, body, payload, status, error, sent_at)
       VALUES ($1,'EMAIL',$2,$3,$4,$5,$6, CASE WHEN $5='SENT' THEN NOW() ELSE NULL END)`,
      [userId || null, subject, html || text || '', payload, status, error]
    );
  } catch (logErr) {
    console.error('[mailer] notification log failed:', logErr.message);
  }
  return { status, error };
}

export default sendEmail;

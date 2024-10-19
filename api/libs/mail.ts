import mailgunFactory from 'mailgun-js';
import Sentry from '@sentry/node';

const mailgun = mailgunFactory({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
});

export default async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    mailgun.messages().send({
      from: process.env.MAILGUN_DEFAULT_TO_EMAIL,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    Sentry.captureException(error);
    return true;
  }
}

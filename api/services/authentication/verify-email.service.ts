import { ApolloError } from 'apollo-server-express';
import dayjs from 'dayjs';
import {
  findToken,
  changeTokenStatus,
  createToken,
} from '~/repository/user_tokens.repository';
import { activeUser } from '~/repository/user.repository';
import generateRandomKey from '~/helpers/genarateRandomkey';
import compileEmailTemplate from '~/helpers/compile-email-template';
import sendMail from '~/libs/mail';
import logger from '~/utils/logger';
import { normalizeEmail } from '~/helpers/string.helper';
import { SEND_MAIL_TYPE } from '~/constants/send-mail-type.constant';
import type { UserProfile } from '~/repository/user.repository';

function isValidDate(createdAt: string): boolean {
  return dayjs(createdAt).add(15, 'minute').diff(dayjs()) > 0;
}

export async function verifyEmail(authToken: string): Promise<true | ApolloError> {
  try {
    const token = await findToken(authToken);

    if (!token || !token.is_active || token.type !== SEND_MAIL_TYPE.VERIFY_EMAIL) {
      return new ApolloError('Invalid token');
    }

    if (!isValidDate(token.created_at)) {
      return new ApolloError('Token had expired');
    }

    await Promise.all([changeTokenStatus(token.id, token.type, false), activeUser(token.user_id)]);

    return true;
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

export async function resendEmailAction(user: UserProfile, type: 'verify_email' | 'forgot_password'): Promise<boolean> {
  try {
    let template;
    let subject;
    const token = await generateRandomKey();
    switch (type) {
      case SEND_MAIL_TYPE.VERIFY_EMAIL:
        if (user.is_active) {
          throw new ApolloError('Account verified');
        }
        subject = 'Resend confirm your email address';
        template = await compileEmailTemplate({
          fileName: 'verifyEmail.mjml',
          data: {
            name: user.name,
            url: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
          },
        });
        break;

      case SEND_MAIL_TYPE.FORGOT_PASSWORD:
        subject = 'Resend reset password';
        template = await compileEmailTemplate({
          fileName: 'forgotPassword.mjml',
          data: {
            name: user.name,
            url: `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`,
          },
        });
        break;

      default:
        subject = 'Resend confirm your email address';
        template = await compileEmailTemplate({
          fileName: 'verifyEmail.mjml',
          data: {
            name: user.name,
            url: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
          },
        });
        break;
    }

    await changeTokenStatus(null, type, false);
    await Promise.all([createToken(user.id, token, type), sendMail(normalizeEmail(user.email), subject, template)]);

    return true;
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

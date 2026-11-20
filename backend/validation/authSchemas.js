import { z } from 'zod';
import { cleanText } from '../utils/text.js';
import { TOKEN_PATTERN } from '../services/accountMail.js';

// Every auth field must be a plain string. This also blocks query-operator
// objects such as { "$gt": "" } from reaching MongoDB filters.
const email = z
  .string({ required_error: 'E-Mail ist erforderlich', invalid_type_error: 'E-Mail ist ungültig' })
  .trim()
  .toLowerCase()
  .max(254, 'E-Mail ist zu lang')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Bitte gib eine gültige E-Mail-Adresse ein');

const existingPassword = z
  .string({ required_error: 'Passwort ist erforderlich', invalid_type_error: 'Passwort ist ungültig' })
  .min(1, 'Passwort ist erforderlich')
  .max(128, 'Passwort ist zu lang');

const newPassword = z
  .string({ required_error: 'Passwort ist erforderlich', invalid_type_error: 'Passwort ist ungültig' })
  .min(8, 'Das Passwort muss mindestens 8 Zeichen haben')
  .max(128, 'Das Passwort darf höchstens 128 Zeichen haben');

export const registerSchema = z.object({
  name: z.preprocess(
    cleanText,
    z
      .string({ required_error: 'Name ist erforderlich', invalid_type_error: 'Name ist ungültig' })
      .min(2, 'Name muss mindestens 2 Zeichen haben')
      .max(80, 'Name darf höchstens 80 Zeichen haben')
  ),
  email,
  password: newPassword,
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Bitte bestätige, dass du mindestens 16 Jahre alt bist' }),
  }),
});

export const loginSchema = z.object({ email, password: existingPassword });

export const updatePasswordSchema = z.object({
  currentPassword: existingPassword,
  newPassword,
});

export const deleteAccountSchema = z.object({ password: existingPassword });

// One-time token from an email link (32 random bytes as hex). Anything else,
// including non-strings, is simply an invalid link.
const linkToken = z
  .string({ required_error: 'Der Link ist ungültig', invalid_type_error: 'Der Link ist ungültig' })
  .trim()
  .regex(TOKEN_PATTERN, 'Der Link ist ungültig');

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ token: linkToken, password: newPassword });

export const verifyEmailSchema = z.object({ token: linkToken });

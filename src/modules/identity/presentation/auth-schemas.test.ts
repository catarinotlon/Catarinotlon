import { describe, expect, it } from 'vitest';

import { resetPasswordSchema, signInSchema, signUpSchema, toFieldErrors } from './auth-schemas';

const validSignUp = {
  name: ' Runner One ',
  email: ' Runner@Example.TEST ',
  password: 'long-enough',
  phone: ' 5500000000 ',
  acceptLegal: 'on',
};

describe('signUpSchema', () => {
  it('normalizes valid input', () => {
    expect(signUpSchema.parse(validSignUp)).toEqual({
      name: 'Runner One',
      email: 'runner@example.test',
      password: 'long-enough',
      phone: '5500000000',
      acceptLegal: true,
    });
  });

  it.each([
    ['name', { name: '  ' }, 'errors.required'],
    ['email', { email: 'not-an-email' }, 'errors.invalidEmail'],
    ['password', { password: 'short' }, 'errors.passwordTooShort'],
    ['phone', { phone: ' ' }, 'errors.required'],
  ])('reports %s with a message key', (field, change, key) => {
    const result = signUpSchema.safeParse({ ...validSignUp, ...change });

    expect(result.success).toBe(false);
    expect(result.success ? {} : toFieldErrors(result.error)).toMatchObject({ [field]: key });
  });

  it('requires accepting the legal documents', () => {
    const { acceptLegal: _omitted, ...withoutConsent } = validSignUp;

    const result = signUpSchema.safeParse(withoutConsent);

    expect(result.success ? {} : toFieldErrors(result.error)).toMatchObject({
      acceptLegal: 'errors.acceptLegal',
    });
  });
});

describe('signInSchema', () => {
  it('normalizes the email and keeps the password as typed', () => {
    expect(signInSchema.parse({ email: ' A@Example.test', password: ' pass ' })).toEqual({
      email: 'a@example.test',
      password: ' pass ',
    });
  });

  it('requires a password', () => {
    const result = signInSchema.safeParse({ email: 'a@example.test', password: '' });

    expect(result.success ? {} : toFieldErrors(result.error)).toMatchObject({
      password: 'errors.required',
    });
  });
});

describe('resetPasswordSchema', () => {
  it('accepts matching passwords', () => {
    const input = { password: 'long-enough', confirm: 'long-enough', token: 'token' };

    expect(resetPasswordSchema.safeParse(input).success).toBe(true);
  });

  it('reports a mismatch on the confirmation field', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'long-enough',
      confirm: 'different-one',
      token: 'token',
    });

    expect(result.success ? {} : toFieldErrors(result.error)).toMatchObject({
      confirm: 'errors.passwordsDontMatch',
    });
  });
});

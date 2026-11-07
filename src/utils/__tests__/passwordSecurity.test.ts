import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  generateTempPassword,
} from '../passwordSecurity';

describe('passwordSecurity', () => {
  it('hashes with salt and verifies', async () => {
    const a = await hashPassword('Secret123');
    const b = await hashPassword('Secret123');
    expect(a.passwordHash).not.toBe(b.passwordHash);
    expect(await verifyPassword('Secret123', a.passwordHash, a.passwordSalt)).toBe(true);
    expect(await verifyPassword('secret123', a.passwordHash, a.passwordSalt)).toBe(false);
  });

  it('rejects weak and publicly known passwords', () => {
    expect(validatePassword('short1')).not.toBeNull();
    expect(validatePassword('alllettersonly')).not.toBeNull();
    expect(validatePassword('BiDOCS#2026')).not.toBeNull();
    expect(validatePassword('Strong123')).toBeNull();
  });

  it('generates temp passwords that satisfy the policy', () => {
    for (let i = 0; i < 20; i++) expect(validatePassword(generateTempPassword())).toBeNull();
  });
});

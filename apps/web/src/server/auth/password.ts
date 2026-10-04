/**
 * Password hashing and policy.
 *
 * Policy follows NIST SP 800-63B's direction: length over composition
 * rules. 12-char minimum, 128 max, no "must contain a symbol" rules.
 */
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const COST = 12;

export const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .max(128, 'Password must be at most 128 characters.');

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Compared against when the email doesn't exist, so a missing account takes
// as long as a wrong password (no account enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', COST);

export async function burnPasswordCheck(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}

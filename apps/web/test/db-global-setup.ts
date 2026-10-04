import { execSync } from 'node:child_process';

// Applies migrations to the test database once per run.
export default function setup(): void {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@localhost:5433/sbtv_test';
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}

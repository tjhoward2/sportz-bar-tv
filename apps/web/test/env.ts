// Test environment. Secrets here are throwaway values for local/CI tests.
process.env.SESSION_SECRET ??= 'test-session-secret-0123456789abcdefghijklmnop';
process.env.JWT_SECRET ??= 'test-jwt-secret-0123456789abcdefghijklmnopqrstuv';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@localhost:5433/sbtv_test';

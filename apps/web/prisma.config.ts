import { defineConfig } from 'prisma/config';

// Migrations use a direct (non-pooled) connection when one is provided —
// Neon's pooler doesn't support everything `migrate` needs.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
    // Scratch DB for `migrate diff` drift checks (CI). Optional elsewhere.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});

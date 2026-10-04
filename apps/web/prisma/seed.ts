/**
 * Demo data for local development: the Cascade sports bar and three
 * staff accounts (PRD demo credentials, lengthened to meet the 12-char
 * password policy). Refuses to run in production.
 *
 *   npm run db:seed -w @sbtv/web
 */
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

const DEMO_PASSWORD = 'cascade-demo-1234';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('Refusing to seed demo accounts in production.');
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const people = [
    { email: 'owner@cascade.bar', firstName: 'Olivia', lastName: 'Owner', role: 'BUSINESS_ADMIN' },
    {
      email: 'manager@cascade.bar',
      firstName: 'Marcus',
      lastName: 'Manager',
      role: 'BUSINESS_ADMIN',
    },
    { email: 'bartender@cascade.bar', firstName: 'Bree', lastName: 'Bartender', role: 'STAFF' },
  ] as const;

  const tvSetup = {
    providersJson: [
      { provider: 'DIRECTV', isPrimary: true },
      { provider: 'XFINITY', isPrimary: false },
    ],
    subscriptionsJson: ['ESPN_PLUS', 'PEACOCK'],
    zip: '97201',
    favoriteTeams: ['Trail Blazers', 'Timbers', 'Seahawks', 'Ducks'],
  };

  const users = [];
  for (const p of people) {
    users.push(
      await db.user.upsert({
        where: { email: p.email },
        update: {},
        create: {
          email: p.email,
          firstName: p.firstName,
          lastName: p.lastName,
          passwordHash,
          isSuperAdmin: p.email === 'owner@cascade.bar',
          ...tvSetup,
        },
      }),
    );
  }

  const owner = users[0]!;
  const business =
    (await db.business.findFirst({ where: { ownerUserId: owner.id } })) ??
    (await db.business.create({
      data: { name: 'Cascade Sports Bar', ownerUserId: owner.id, city: 'Portland', state: 'OR' },
    }));
  for (const [i, p] of people.entries()) {
    await db.membership.upsert({
      where: { userId_businessId: { userId: users[i]!.id, businessId: business.id } },
      update: {},
      create: { userId: users[i]!.id, businessId: business.id, role: p.role },
    });
  }

  await db.$disconnect();
  console.warn(`Seeded ${people.length} demo users (password: ${DEMO_PASSWORD}).`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

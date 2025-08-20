import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// We'll tag seed data so we can safely delete/reseed without touching real data.
const SEED_TAG_NOTE = 'seed';
const SEED_INSTITUTION = 'Seed Bank';

// Demo users to create
const DEMO_USERS = [
  { email: 'alice@example.com', name: 'Alice' },
  { email: 'bob@example.com',   name: 'Bob'   },
  { email: 'carol@example.com', name: 'Carol' },
];

// Simple helpers
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function dec(n: number) {
  return new Prisma.Decimal(n.toFixed(2));
}

async function upsertUser(email: string, name: string, plainPassword: string) {
  // hash on first create; leave existing users’ hashes unchanged on reruns
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, passwordHash },
    update: {}, // don't change existing user fields on reseed
    select: { id: true, email: true, name: true },
  });
  return user;
}

async function reseedForUser(userId: string) {
  // Delete ONLY previously seeded data for this user
  await prisma.transaction.deleteMany({ where: { userId, note: SEED_TAG_NOTE } });
  await prisma.account.deleteMany({ where: { userId, institution: SEED_INSTITUTION } });

  // Create two seed accounts
  const checking = await prisma.account.create({
    data: {
      userId,
      name: 'Everyday Checking',
      institution: SEED_INSTITUTION,
      type: 'depository',
      subtype: 'checking',
      mask: '1111',
    },
  });

  const credit = await prisma.account.create({
    data: {
      userId,
      name: 'Rewards Credit Card',
      institution: SEED_INSTITUTION,
      type: 'credit',
      subtype: 'credit card',
      mask: '2222',
    },
  });

  // Transactions to insert (negative = money out, positive = money in)
  // Checking account (last ~10 days)
  const checkingTx = [
    { postedAt: daysAgo(1),  amount: -18.75, merchant: 'Coffee Shop',    category: 'Coffee' },
    { postedAt: daysAgo(2),  amount: -42.10, merchant: 'Grocery Town',   category: 'Groceries' },
    { postedAt: daysAgo(3),  amount: -12.99, merchant: 'App Store',      category: 'Digital' },
    { postedAt: daysAgo(5),  amount: +950.00, merchant: 'Acme, Inc.',    category: 'Income' },
    { postedAt: daysAgo(7),  amount: -64.50, merchant: 'Fuel Station',   category: 'Gas' },
    { postedAt: daysAgo(9),  amount: -28.00, merchant: 'Takeout Place',  category: 'Dining' },
  ];

  // Credit card (last ~12 days)
  const creditTx = [
    { postedAt: daysAgo(1),  amount: -35.20, merchant: 'Amazon',         category: 'Shopping' },
    { postedAt: daysAgo(4),  amount: -89.99, merchant: 'ElectroMart',    category: 'Electronics' },
    { postedAt: daysAgo(8),  amount: -14.29, merchant: 'MusicStream',    category: 'Subscriptions' },
    { postedAt: daysAgo(12), amount: -120.00, merchant: 'Restaurant',    category: 'Dining' },
  ];

  // Persist transactions
  for (const t of checkingTx) {
    await prisma.transaction.create({
      data: {
        userId,
        accountId: checking.id,
        postedAt: t.postedAt,
        pending: false,
        amount: dec(t.amount),
        currency: 'USD',
        merchant: t.merchant,
        category: t.category,
        note: SEED_TAG_NOTE,
      },
    });
  }
  for (const t of creditTx) {
    await prisma.transaction.create({
      data: {
        userId,
        accountId: credit.id,
        postedAt: t.postedAt,
        pending: false,
        amount: dec(t.amount),
        currency: 'USD',
        merchant: t.merchant,
        category: t.category,
        note: SEED_TAG_NOTE,
      },
    });
  }
}

async function main() {
  console.log('🌱 Seeding demo data…');

  // Safety: tell the user where we’re seeding
  console.log('Using DATABASE_URL =', process.env.DATABASE_URL?.replace(/:[^@]*@/, ':****@'));

  for (const u of DEMO_USERS) {
    const user = await upsertUser(u.email, u.name, 'password123');
    console.log(`🔸 User ready: ${user.email} (${user.id})`);
    await reseedForUser(user.id);
    console.log(`   ↳ accounts & transactions seeded`);
  }

  console.log('✅ Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

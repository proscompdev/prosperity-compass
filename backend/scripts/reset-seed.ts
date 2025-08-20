import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SEED_TAG_NOTE = 'seed';
const SEED_INSTITUTION = 'Seed Bank';

async function main() {
  console.log('Deleting seed data (accounts/transactions only)…');
  // Delete child first
  await prisma.transaction.deleteMany({ where: { note: SEED_TAG_NOTE } });
  await prisma.account.deleteMany({ where: { institution: SEED_INSTITUTION } });
  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ACCOUNT = 'nazir';

/** Akkaunt darajasidagi sozlamalar (admin → Sozlamalar). Kalitlar akkaunt bilan prefikslanadi. */
const SETTINGS: Record<string, string> = {
  meta_pixel: '',
  meta_capi_token: '',
};

async function main() {
  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASSWORD || 'ChangeMeNow!2026';
  const hash = await bcrypt.hash(pass, 12);

  await prisma.adminUser.upsert({
    where: { username: user },
    create: { username: user, passwordHash: hash },
    update: { passwordHash: hash },
  });

  await prisma.account.upsert({
    where: { code: ACCOUNT },
    create: { code: ACCOUNT, name: 'Ilimbooks', sortOrder: 0 },
    update: {},
  });

  for (const [key, value] of Object.entries(SETTINGS)) {
    const scoped = `${ACCOUNT}:${key}`;
    await prisma.setting.upsert({
      where: { key: scoped },
      create: { key: scoped, value },
      update: {}, // mavjud qiymatni buzmaydi
    });
  }

  // ShoxMarket marketi (migratsiyada yaratiladi; yangi bazada shu yerda)
  const shoxKey = (process.env.SHOX_API_KEY || '').trim();
  await prisma.market.upsert({
    where: { account_code: { account: ACCOUNT, code: 'shoxmarket' } },
    create: {
      account: ACCOUNT,
      code: 'shoxmarket',
      name: 'ShoxMarket',
      endpoint: 'https://api.shoxmarket.uz/create',
      apiKey: shoxKey,
      defaultStream: (process.env.SHOX_STREAM || '').trim(),
      defaultOfferId: (process.env.SHOX_OFFER_ID || '1').trim(),
      sortOrder: 0,
    },
    update: shoxKey ? { apiKey: shoxKey } : {},
  });

  console.log(`Seeded admin "${user}", akkaunt "${ACCOUNT}", ShoxMarket marketi va sozlamalar`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

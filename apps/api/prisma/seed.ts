import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Boshlang‘ich integratsiya sozlamalari (admin → Sozlamalar'da tahrirlanadi). Landinglar API ishga tushganda avtomatik yaratiladi. */
const SETTINGS: Record<string, string> = {
  shox_endpoint: 'https://api.shoxmarket.uz/create',
  shox_api_key: process.env.SHOX_API_KEY || '',
  shox_stream: process.env.SHOX_STREAM || '',
  shox_offer_id: process.env.SHOX_OFFER_ID || '1',
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

  for (const [key, value] of Object.entries(SETTINGS)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: {}, // mavjud qiymatni buzmaydi
    });
  }

  console.log(`Seeded admin "${user}" and settings (ilimbooks · Soyali Qur'on)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

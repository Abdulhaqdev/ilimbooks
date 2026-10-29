import { PrismaClient } from '@prisma/client';

/**
 * Ziyomarket akkaunti: alohida account + market (Amiram kabi).
 * Katalog/landings keyin alohida qo'shiladi.
 *
 * API kaliti .env dan (ZIYO_API_KEY). Bo'sh bo'lsa — admin → Marketlar dan kiritiladi.
 */
const ACCOUNT = 'ziyomarket';

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.account.upsert({
      where: { code: ACCOUNT },
      create: { code: ACCOUNT, name: 'Ziyomarket', sortOrder: 2 },
      update: {},
    });

    for (const key of ['meta_pixel', 'meta_capi_token'] as const) {
      const scoped = `${ACCOUNT}:${key}`;
      await prisma.setting.upsert({
        where: { key: scoped },
        create: { key: scoped, value: '' },
        update: {},
      });
    }

    const apiKey = (process.env.ZIYO_API_KEY || '').trim();
    const market = await prisma.market.upsert({
      where: { account_code: { account: ACCOUNT, code: 'ziyomarket' } },
      create: {
        account: ACCOUNT,
        code: 'ziyomarket',
        name: 'Ziyomarket',
        endpoint: 'https://api.ziyomarket.uz/create',
        apiKey,
        defaultStream: (process.env.ZIYO_STREAM || '').trim(),
        defaultOfferId: (process.env.ZIYO_OFFER_ID || '').trim(),
        sortOrder: 0,
      },
      update: apiKey ? { apiKey } : {},
    });

    console.log(
      `akkaunt: ${ACCOUNT} · market: ${market.name} (${market.endpoint}) · api_key=${
        market.apiKey ? 'bor' : "YO'Q — admin panelda kiriting"
      }`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

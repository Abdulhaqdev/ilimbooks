import { Prisma, PrismaClient } from '@prisma/client';
import { AMIRAM_CATALOG } from '../src/landings/amiram-catalog';
import { sanitizeContent } from '../src/landings/landing-content';

/**
 * Amiram akkaunti: account + market + katalogdagi har bir offer uchun landing.
 * Mavjud slug'larga tegmaydi — qayta ishga tushirish xavfsiz.
 *
 * API kaliti .env dan olinadi (AMIRAM_API_KEY). Bo'sh bo'lsa market kalitsiz
 * yaratiladi — keyin admin → Marketlar sahifasidan kiritiladi.
 */
const ACCOUNT = 'amiram';

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.account.upsert({
      where: { code: ACCOUNT },
      create: { code: ACCOUNT, name: 'Amiram', sortOrder: 1 },
      update: {},
    });

    const apiKey = (process.env.AMIRAM_API_KEY || '').trim();
    const market = await prisma.market.upsert({
      where: { account_code: { account: ACCOUNT, code: 'amiram' } },
      create: {
        account: ACCOUNT,
        code: 'amiram',
        name: 'Amiram',
        endpoint: 'https://api.Amiram.uz/create',
        apiKey,
        defaultStream: (process.env.AMIRAM_STREAM || '').trim(),
        defaultOfferId: '',
        sortOrder: 0,
      },
      // mavjud kalitni o'chirib yubormaymiz
      update: apiKey ? { apiKey } : {},
    });
    console.log(
      `market: ${market.name} (${market.endpoint}) api_key=${market.apiKey ? 'bor' : "YO'Q — admin panelda kiriting"}`,
    );

    const existing = new Set(
      (await prisma.landing.findMany({ select: { slug: true } })).map((l) => l.slug),
    );
    let order =
      ((await prisma.landing.aggregate({ where: { account: ACCOUNT }, _max: { sortOrder: true } }))
        ._max.sortOrder ?? -1) + 1;
    let created = 0;
    let skipped = 0;
    for (const it of AMIRAM_CATALOG) {
      if (existing.has(it.slug)) {
        console.log(`skip  /${it.slug} (slug band)`);
        skipped++;
        continue;
      }
      await prisma.landing.create({
        data: {
          slug: it.slug,
          name: `${it.name} (Amiram #${it.offerId})`,
          template: it.template,
          account: ACCOUNT,
          marketId: market.id,
          active: true,
          content: sanitizeContent(it.content) as unknown as Prisma.InputJsonValue,
          offerId: String(it.offerId),
          stream: '', // har bir offer uchun oqim admin panelda kiritiladi
          sortOrder: order++,
        },
      });
      existing.add(it.slug);
      created++;
      console.log(`new   /${it.slug}  ${it.template}  offer=${it.offerId}  ${it.name}`);
    }
    console.log(
      `\nTayyor: ${created} ta landing yaratildi, ${skipped} ta o'tkazib yuborildi (jami katalog: ${AMIRAM_CATALOG.length}).`,
    );
    if (!market.apiKey) {
      console.log('⚠️  Market api_key bo‘sh — admin → Marketlar sahifasida kiriting.');
    }
    console.log('⚠️  Har bir landingga Amiram panelidan oqim (stream) kalitini kiritish kerak.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

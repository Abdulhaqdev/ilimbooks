import { Prisma, PrismaClient } from '@prisma/client';
import { sanitizeContent } from '../src/landings/landing-content';
import { SHOX_CATALOG } from '../src/landings/shox-catalog';

/** ShoxMarket tovarlari uchun landinglarni yaratadi. Mavjud slug'larga tegmaydi — qayta ishga tushirish xavfsiz. */
const ACCOUNT = 'nazir';

async function main() {
  const prisma = new PrismaClient();
  try {
    const market = await prisma.market.findUnique({
      where: { account_code: { account: ACCOUNT, code: 'shoxmarket' } },
    });
    if (!market) {
      console.log("⚠️  ShoxMarket marketi topilmadi — avval `npm run prisma:migrate` va `prisma:seed`.");
    }
    const existing = new Set((await prisma.landing.findMany({ select: { slug: true } })).map((l) => l.slug));
    let order = ((await prisma.landing.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0) + 1;
    let created = 0;
    for (const it of SHOX_CATALOG) {
      if (existing.has(it.slug)) {
        console.log(`skip  /${it.slug} (mavjud)`);
        continue;
      }
      await prisma.landing.create({
        data: {
          slug: it.slug,
          name: `${it.name} (ShoxMarket #${it.offerId})`,
          template: it.template,
          active: true,
          content: sanitizeContent(it.content) as unknown as Prisma.InputJsonValue,
          account: ACCOUNT,
          marketId: market?.id ?? null,
          offerId: String(it.offerId),
          sortOrder: order++,
        },
      });
      created++;
      console.log(`new   /${it.slug}  ${it.template}  offer=${it.offerId}`);
    }
    console.log(`Tayyor: ${created} ta yangi landing, ${SHOX_CATALOG.length - created} ta o‘tkazib yuborildi.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

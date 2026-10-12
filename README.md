# ilimbooks

Ko'p akkauntli landing fabrikasi. Har bir landingdagi buyurtma formasi (ism +
telefon) backend orqali o'z **CPA marketi**ga (ShoxMarket, Amiram, ...) uzatiladi;
admin panelda landinglar, buyurtmalar, reklama analitikasi va market kalitlari.

## Akkauntlar va marketlar

- **Akkaunt** (`Account`) — admin paneldagi yuqori o'ngdagi almashtirgich. Har
  akkauntning o'z landinglari, buyurtmalari, analitikasi va Meta Pixel'i bor.
  Hozircha: `nazir` (Ilimbooks / ShoxMarket), `amiram` (Amiram).
- **Market** (`Market`) — CPA tizimi: `endpoint` + `api_key` + standart
  `stream`/`offer_id`. Barcha "AliTrend" tizimidagi marketlar bir xil API
  shakliga ega, shuning uchun bitta uzatuvchi (`markets/market-forward.ts`)
  hammasiga yetadi.
- Landing o'z `marketId`, `stream` (oqim) va `offerId` qiymatiga ega; bo'sh
  bo'lsa marketning standart qiymati ishlatiladi.

## Domenlar

- Landing: https://ilimbooks.uz
- Admin: https://admin.ilimbooks.uz

## Stack

- `apps/api` — NestJS + Prisma + PostgreSQL (port 3040)
- `apps/landing` — Vite React (Soyali Qur'on mahsulot landingi)
- `apps/admin` — Vite React + TanStack Query + Recharts

## Sozlamalar

- **Marketlar** sahifasi: market API kaliti, standart oqim/offer, sinov buyurtma.
- **Sozlamalar** sahifasi: Meta Pixel ID va Conversions API tokeni (akkaunt bo'yicha).
- **Landing → Integratsiya**: shu landing uchun market, oqim, offer_id va Pixel.

## Buyurtma oqimi

Landing forma → `POST /api/order` → sahifaga mos landing topiladi (akkaunt +
market + oqim + offer) → `Lead` bazaga yoziladi → market API'siga
`POST /create` (form-urlencoded: api_key, stream, offer_id, name, phone) →
holat (`sent`/`failed`) adminda "Buyurtmalar" sahifasida. Uzatilmagan buyurtma
bazada qoladi va oqim tuzatilgach "qayta yuborish" tugmasi bilan yuboriladi.

## Seed

```bash
npm run prisma:migrate                 # migratsiyalar
npm run prisma:seed       -w api       # admin, nazir akkaunti, ShoxMarket marketi
npm run prisma:seed:shox  -w api       # ShoxMarket katalogidan landinglar
npm run prisma:seed:amiram -w api      # amiram akkaunti + 70 ta landing (AMIRAM_API_KEY)
```

## Deploy

`deploy/` ga qarang — rsync `/var/www/ilimbooks`, pm2 `ilimbooks-api` (3040),
nginx (`ilimbooks.uz`, `admin.ilimbooks.uz`) + certbot.

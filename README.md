# ilimbooks

Bitta mahsulot landingi (Soyali Qur'on Husnixati) + admin panel. Landingdagi
buyurtma formasi (ism + telefon) backend orqali **ShoxMarket API**'ga uzatiladi;
admin panelda buyurtmalar, reklama analitikasi va sozlamalar ko'rinadi.

## Domenlar

- Landing: https://ilimbooks.uz
- Admin: https://admin.ilimbooks.uz

## Stack

- `apps/api` — NestJS + Prisma + PostgreSQL (port 3040)
- `apps/landing` — Vite React (Soyali Qur'on mahsulot landingi)
- `apps/admin` — Vite React + TanStack Query + Recharts

## Sozlamalar (admin → Sozlamalar)

- Mahsulot matnlari va narxlari
- ShoxMarket API: `shox_endpoint`, `shox_api_key`, `shox_stream`, `shox_offer_id` (maxfiy, landingga chiqmaydi)
- Meta Pixel ID (hozircha bo'sh — reklama boshlanganda kiritiladi)

## Buyurtma oqimi

Landing forma → `POST /api/order` → `Lead` bazaga yoziladi → ShoxMarket
`POST /create` (form-urlencoded: api_key, stream, offer_id, name, phone) →
holat (`sent`/`failed`) adminda "Buyurtmalar" sahifasida.

## Deploy

`deploy/` ga qarang — rsync `/var/www/ilimbooks`, pm2 `ilimbooks-api` (3040),
nginx (`ilimbooks.uz`, `admin.ilimbooks.uz`) + certbot.

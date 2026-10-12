import { DEFAULT_CONTENT, LandingContent, Template } from './landing-content';
import { AMIRAM_CATALOG, amiramPreset } from './amiram-catalog';
import { CatalogItem, SHOX_CATALOG } from './shox-catalog';

export type Preset = {
  id: string;
  name: string;
  goal: string;
  product: string;
  category: string;
  source: string;
  /** Qaysi market katalogidan (Market.code) — landing yaratilganda shu market tanlanadi */
  marketCode?: string;
  sourceUrl: string;
  template: Template;
  tags: string[];
  /** Market mahsulot raqami — shablondan yaratilgan landingga offer_id bo‘lib o‘tadi. */
  offerId?: string;
  /** Market lead uchun to'laydigan summa (so'mda, matn ko'rinishida) — tanlashda muhim */
  payout?: string;
  content: LandingContent;
};

const TRUST = ['🚚 Bepul yetkazish', '💵 Qo‘lga olib to‘lash', '✅ Sifat kafolati'];

const BASE: LandingContent = {
  ...DEFAULT_CONTENT,
  currency: 'so‘m',
  formTitle: 'Buyurtma berish',
  formSubtitle: 'Ism va raqamingizni qoldiring — operator 15 daqiqada qo‘ng‘iroq qiladi',
  ctaText: 'Buyurtma berish',
  trust: TRUST,
  successTitle: 'Buyurtmangiz qabul qilindi!',
  successText: 'Operatorimiz tez orada qo‘ng‘iroq qilib, manzilni aniqlashtiradi. Rahmat!',
  guaranteeTitle: 'Xavfsiz xarid',
  guaranteeText: 'Mahsulotni qo‘lingizga olib, ko‘rib, keyin to‘laysiz. Oldindan to‘lov yo‘q.',
  footerText: '© 2026 — barcha huquqlar himoyalangan.',
  reviews: [],
  faq: [],
  bundle: [],
  problemTitle: '',
  problems: [],
  stockLeft: '',
  videoUrl: '',
  accent: '',
};

const FAQ_DELIVERY = { q: 'Yetkazib berish qancha vaqt oladi?', a: 'Toshkent bo‘ylab 1 kun, viloyatlarga 2–4 kun. Yetkazish bepul.' };
const FAQ_PAY = { q: 'To‘lov qanday amalga oshiriladi?', a: 'Oldindan to‘lov yo‘q. Mahsulotni qo‘lingizga olib, ko‘rib, keyin kuryerga naqd yoki karta orqali to‘laysiz.' };

const img = (dir: string, n: number) => Array.from({ length: n }, (_, i) => `/t/${dir}/${i + 1}.webp`);

const TEMPLATE_NAME: Record<Template, string> = {
  full: 'Klassik',
  compact: 'Kompakt',
  story: 'Story / Reels',
  flash: 'Mega aksiya',
  problem: 'Muammo → Yechim',
  reviews: 'Sharhlar',
  premium: 'Premium',
  kids: 'Bolalar',
  bundle: 'To‘plam',
  minimal: 'Minimal do‘kon',
};

const SHOX_CATEGORY: [string, number[]][] = [
  ['Bolalar uchun', [2, 3, 6, 7, 8, 16, 19, 32, 37]],
  ['Namoz va zikr', [4, 11, 12, 14, 15, 20, 21, 40]],
  ['Diniy kitoblar', [5, 17, 18, 22, 27, 28, 29, 30, 31, 39, 41]],
];

function fromCatalog(c: CatalogItem): Preset {
  return {
    id: `shox-${c.offerId}`,
    name: TEMPLATE_NAME[c.template],
    goal: c.content.subtitle,
    product: c.name,
    category: SHOX_CATEGORY.find(([, ids]) => ids.includes(c.offerId))?.[0] ?? 'Oila va hayot kitoblari',
    source: 'shoxmarket.uz',
    marketCode: 'shoxmarket',
    sourceUrl: `https://shoxmarket.uz/product/${c.offerId}`,
    template: c.template,
    tags: [`ShoxMarket #${c.offerId}`, TEMPLATE_NAME[c.template]],
    offerId: String(c.offerId),
    content: c.content,
  };
}

export const PRESETS: Preset[] = [
  {
    id: 'klassik-soyali-quron',
    name: 'Klassik',
    goal: 'Batafsil tanishtirish — galereya, taymer, afzalliklar va kafolat',
    product: 'Katta Soyali Qur’on (24×35)',
    category: 'Diniy kitoblar',
    source: 'shoxmarket.uz',
    marketCode: 'shoxmarket',
    sourceUrl: 'https://shoxmarket.uz/product/36',
    template: 'full',
    tags: ['Barcha mahsulotlar', 'Uzun sahifa'],
    content: {
      ...BASE,
      brand: 'ilimbooks.uz',
      title: 'KATTA SOYALI QUR’ON (24×35)',
      subtitle: 'Arab harflari ustidan yozib, Qur’on husnixatini uyda o‘rganing',
      images: [...img('klassik', 1), '/product/2.jpg', '/product/3.webp'],
      marquee: '✦ KATTA SOYALI QUR’ON · 🔥 -33% AKSIYA · 🚚 BEPUL YETKAZISH · 💵 QO‘LGA OLIB TO‘LASH',
      hitBadge: '🔥 HIT',
      chips: ['🌙 Katta format', '✍️ Qalam sovg‘a', '💵 Qo‘lga olib to‘lash'],
      rating: '4.9',
      reviewsCount: '3 200+',
      priceOld: '299 000',
      priceNew: '199 000',
      timerLabel: 'Aksiya tugashiga',
      urgency: 'Aksiya narxi faqat bugun — ertaga narx 299 000 so‘mga qaytadi',
      benefitsTitle: 'Nega aynan Katta Soyali Qur’on?',
      benefits: [
        { icon: '📐', title: 'Katta 24×35 format', text: 'Harflar yirik — ko‘z charchamaydi, yozish qulay.' },
        { icon: '✍️', title: 'Soya ustidan yozish', text: 'Harflar ustidan yurgizib, husnixatni tez o‘zlashtirasiz.' },
        { icon: '🎁', title: 'Qalam sovg‘a', text: 'Maxsus qalam to‘plam bilan birga keladi.' },
        { icon: '👨‍👩‍👧', title: 'Butun oila uchun', text: 'Bolalar ham, kattalar ham birga o‘rganadi.' },
      ],
      seoTitle: 'Katta Soyali Qur’on 24×35 — aksiya narxida',
      seoDescription: 'Soyali harflar ustidan yozib Qur’on husnixatini o‘rganing. Bepul yetkazish, qo‘lga olib to‘lash.',
      faq: [FAQ_DELIVERY, FAQ_PAY],
    },
  },
  {
    id: 'kompakt-5d-namoz',
    name: 'Kompakt',
    goal: 'Bitta ekran — tez qaror, arzon mahsulotlar uchun ideal',
    product: '5D Namoz Book',
    category: 'Diniy kitoblar',
    source: 'shoxmarket.uz',
    marketCode: 'shoxmarket',
    sourceUrl: 'https://shoxmarket.uz/product/40',
    template: 'compact',
    tags: ['Arzon tovar', 'Scrollsiz'],
    content: {
      ...BASE,
      brand: 'ilimbooks.uz',
      title: '5D NAMOZ BOOK',
      subtitle: 'Namozni bosqichma-bosqich, rasmlar bilan oson o‘rganing',
      images: img('kompakt', 1),
      reviewsCount: '2 100+ o‘quvchi',
      rating: '4.8',
      priceOld: '149 000',
      priceNew: '99 000',
      urgency: 'Bugun buyurtma bering — aksiya narxi saqlanib qoladi',
      ctaText: 'Buyurtma berish',
      trust: ['🚚 Bepul', '💵 Qo‘lga olib to‘lash', '✅ Kafolat'],
      seoTitle: '5D Namoz Book — namozni oson o‘rganing',
      seoDescription: 'Namozni rasmlar bilan bosqichma-bosqich o‘rgatuvchi kitob. Aksiya: 99 000 so‘m.',
    },
  },
  {
    id: 'premium-ruchkali-quron',
    name: 'Premium',
    goal: 'Nafis, qimmat ko‘rinish — qimmatbaho mahsulot va sovg‘alar uchun',
    product: 'Ruchkali Qur’oni Karim',
    category: 'Diniy kitoblar',
    source: 'shoxmarket.uz',
    marketCode: 'shoxmarket',
    sourceUrl: 'https://shoxmarket.uz/product/5',
    template: 'premium',
    tags: ['Qimmat tovar', 'Sovg‘a'],
    content: {
      ...BASE,
      brand: 'ilimbooks.uz',
      title: 'Ruchkali Qur’oni Karim',
      subtitle: 'Sensorli ruchkani oyatga tekkizing — mashhur qorilar ovozida tinglang',
      images: img('premium', 1),
      hitBadge: 'Premium sovg‘a',
      chips: ['🎧 Qorilar ovozi', '💼 Sovg‘a qutisida', '🔋 USB zaryad'],
      rating: '5.0',
      reviewsCount: '1 200+',
      priceOld: '849 000',
      priceNew: '699 000',
      timerLabel: 'Maxsus narx amal qiladi',
      urgency: 'Ramazon va to‘ylar uchun eng munosib hadya',
      ctaText: 'Buyurtma berish',
      benefitsTitle: 'Har bir oila uchun bebaho hadya',
      benefits: [
        { icon: '🎧', title: 'Ovozli tilovat', text: 'Ruchkani istalgan oyatga tekkizing — darhol tilovat eshitiladi.' },
        { icon: '📖', title: 'Tajvid bilan o‘rganish', text: 'To‘g‘ri talaffuzni eshitib, takrorlab o‘rganasiz.' },
        { icon: '💼', title: 'Nafis quti', text: 'Maxsus sovg‘a qutisida — hadya qilishga tayyor.' },
        { icon: '👨‍👩‍👧', title: 'Butun oila uchun', text: 'Bolalar ham, keksalar ham qulay foydalanadi.' },
      ],
      reviews: [
        { name: 'Abdulloh', city: 'Toshkent', text: 'Otamga hadya qildim. Qutisi juda chiroyli, ovoz sifati a’lo.', rating: 5 },
        { name: 'Mohira', city: 'Namangan', text: 'Bolalarim har kuni ruchka bilan sura tinglab yodlashyapti.', rating: 5 },
      ],
      faq: [
        { q: 'Ruchka qanday zaryadlanadi?', a: 'USB kabel orqali, telefon zaryadlagichidan. To‘liq zaryad bir necha kunga yetadi.' },
        FAQ_DELIVERY,
        FAQ_PAY,
      ],
      guaranteeTitle: 'Rasmiy kafolat',
      guaranteeText: 'Ruchkaga kafolat beriladi. Mahsulotni ko‘rib, keyin to‘laysiz.',
      accent: '#d4af37',
      seoTitle: 'Ruchkali Qur’oni Karim — ovozli tilovat, premium sovg‘a',
      seoDescription: 'Sensorli ruchka bilan Qur’on tinglang. Sovg‘a qutisida. Bepul yetkazish.',
    },
  },
  {
    id: 'kids-ilk-joynamoz',
    name: 'Bolalar',
    goal: 'Yorqin va quvnoq — ota-onalarga qaratilgan bolalar tovarlari uchun',
    product: '«Ilk joynamozim» ovozli joynamoz',
    category: 'Bolalar uchun',
    source: 'shoxmarket.uz',
    marketCode: 'shoxmarket',
    sourceUrl: 'https://shoxmarket.uz/product/7',
    template: 'kids',
    tags: ['Bolalar', 'Ota-onalar'],
    content: {
      ...BASE,
      brand: 'ilimbooks.uz',
      title: '«Ilk joynamozim»',
      subtitle: 'Farzandingizga namozni o‘yin orqali o‘rgatuvchi ovozli joynamoz',
      images: img('kids', 1),
      hitBadge: '4–10 yosh',
      chips: ['🔊 Ovozli', '🧒 Bolalar uchun', '🕌 5 mahal namoz'],
      rating: '4.9',
      reviewsCount: '5 800+ oila',
      priceOld: '259 000',
      priceNew: '169 000',
      timerLabel: 'Aksiya tugashiga',
      urgency: 'Farzandingizning birinchi namozi — eng qimmatli xotira',
      ctaText: 'Farzandimga buyurtma',
      benefitsTitle: 'Bolangiz nimani o‘rganadi?',
      benefits: [
        { icon: '🔊', title: 'Ovozli ko‘rsatma', text: 'Har bir harakatni joynamozning o‘zi aytib turadi.' },
        { icon: '🕌', title: '5 mahal namoz', text: 'Bomdoddan xuftongacha — hammasini bosqichma-bosqich.' },
        { icon: '🎈', title: 'O‘yin orqali', text: 'Bola zerikmaydi — o‘zi joynamozga intiladi.' },
        { icon: '🧼', title: 'Yumshoq va xavfsiz', text: 'Bolalar uchun xavfsiz materiallar, oson tozalanadi.' },
      ],
      reviews: [
        { name: 'Shahnoza', city: 'Toshkent', text: '6 yoshli qizim 2 haftada bomdod namozini o‘rgandi. Juda xursandmiz!', rating: 5 },
        { name: 'Jamshid', city: 'Qo‘qon', text: 'O‘g‘lim har kuni o‘zi joynamozni yoyib, ovozni yoqadi.', rating: 5 },
        { name: 'Dildora', city: 'Termiz', text: 'Egizaklarimga ikkita oldim. Sifati yaxshi, ovozi tiniq.', rating: 5 },
      ],
      faq: [
        { q: 'Necha yoshga mos?', a: '4 yoshdan 10 yoshgacha bo‘lgan bolalar uchun eng mos.' },
        { q: 'Batareyasi bormi?', a: 'Ha, batareyalar bilan ishlaydi. Almashtirish oson.' },
        FAQ_PAY,
      ],
      accent: '#ff7a59',
      seoTitle: '«Ilk joynamozim» — bolalar uchun ovozli joynamoz',
      seoDescription: 'Farzandingizga namozni o‘yin orqali o‘rgating. 169 000 so‘m, bepul yetkazish.',
    },
  },
  {
    id: 'bundle-tajvid-mozaika',
    name: 'To‘plam',
    goal: 'To‘plam tarkibi va tejash — o‘rtacha chekni oshiradi',
    product: 'Tajvidli Qur’on + Suralar Mozaikasi',
    category: 'Diniy kitoblar',
    source: 'shoxmarket.uz',
    marketCode: 'shoxmarket',
    sourceUrl: 'https://shoxmarket.uz/product/39',
    template: 'bundle',
    tags: ['To‘plam', 'Bonus', 'O‘rtacha chek'],
    content: {
      ...BASE,
      brand: 'ilimbooks.uz',
      title: 'Tajvidli Qur’on + Suralar Mozaikasi',
      subtitle: 'Qur’on o‘qishni o‘rganish to‘plami — bonus bilan, bitta narxda',
      images: img('bundle', 3),
      hitBadge: '🎁 BONUS',
      chips: ['📗 Tajvidli Qur’on', '🧩 Suralar Mozaikasi', '🎁 Bonus'],
      rating: '4.9',
      reviewsCount: '2 700+',
      priceOld: '299 000',
      priceNew: '199 000',
      timerLabel: 'To‘plam narxi amal qiladi',
      urgency: 'Bonus faqat aksiya davomida — to‘plamni hoziroq band qiling',
      ctaText: 'To‘plamni olish',
      bundle: [
        'Tajvidli Qur’on — rangli tajvid qoidalari bilan',
        'Suralar Mozaikasi — yodlangan har bir sura uchun bo‘lak',
        'Bonus: xatcho‘p va o‘qish rejasi',
      ],
      benefitsTitle: 'To‘plam nima beradi?',
      benefits: [
        { icon: '🎨', title: 'Rangli tajvid', text: 'Qoidalar rang bilan belgilangan — xato o‘qish kamayadi.' },
        { icon: '🧩', title: 'Motivatsiya', text: 'Har bir yodlangan sura — mozaikaga yangi bo‘lak.' },
        { icon: '🏠', title: 'Uy bezagi', text: 'Tayyor mozaika devorga osiladigan nafis panno bo‘ladi.' },
        { icon: '💰', title: 'Tejamkor', text: 'To‘plamda olganingizda 100 000 so‘m arzon.' },
      ],
      reviews: [
        { name: 'Muhammadali', city: 'Toshkent', text: 'Oilamiz bilan birga yodlayapmiz. Mozaika bolalarni juda ruhlantiradi.', rating: 5 },
        { name: 'Sevara', city: 'Navoiy', text: 'Tajvidi rangli bo‘lgani uchun o‘qish osonlashdi.', rating: 5 },
      ],
      faq: [FAQ_DELIVERY, FAQ_PAY],
      seoTitle: 'Tajvidli Qur’on + Suralar Mozaikasi — to‘plam narxida',
      seoDescription: 'Qur’on o‘rganish to‘plami: 199 000 so‘m. Bonus bilan. Bepul yetkazish.',
    },
  },
  ...SHOX_CATALOG.map(fromCatalog),
  ...AMIRAM_CATALOG.map(amiramPreset),
];

export function findPreset(id: unknown) {
  return PRESETS.find((p) => p.id === id);
}

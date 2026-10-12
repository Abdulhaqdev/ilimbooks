export type RotationVariant = {
  id: string;
  landingId: string;
  active: boolean;
  sortOrder: number;
  name: string;
  path: string;
  template: string;
  landingActive: boolean;
  image: string;
  offerId?: string;
  stream?: string;
};

export type Rotation = {
  id: string;
  slug: string;
  path: string;
  name: string;
  active: boolean;
  account: string;
  variants: RotationVariant[];
};

export type RotationRow = {
  id: string;
  slug: string;
  path: string;
  name: string;
  active: boolean;
  total: number;
  live: number;
  images: string[];
  stats7d: { clicks: number; leads: number; cr: number };
  updatedAt: string;
};

export type VariantStat = {
  id: string;
  landingId: string;
  name: string;
  path: string;
  template: string;
  active: boolean;
  landingActive: boolean;
  sortOrder: number;
  image: string;
  sessions: number;
  leads: number;
  sent: number;
  cr: number;
  avgDwellSec: number;
  avgScroll: number;
};

export type RotationStats = {
  rotation: Rotation;
  range: string;
  day?: string;
  totals: { sessions: number; leads: number; cr: number; sent: number };
  variants: VariantStat[];
  /** Ishonchli yetakchi (kamida 20 ko'rish va aniq farq bo'lsa) */
  winner: string;
  /** Har variantga ~100 ko'rish yig'ilganmi */
  enough: boolean;
};

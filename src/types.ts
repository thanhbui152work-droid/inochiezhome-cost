export interface MainProduct {
  barcode: string;
  img?: string;
  vpCode: string;
  name: string;
  rsp: number;
  cogs: number;
  cogsUpdated: number;
  pool: number;
  minPrice: number;
  kolPrice: number;
  spike: number;
  miniSpike: number;
  bau: number;
}

export interface CogsProduct {
  barcode: string;
  mainSku: string;
  img: string;
  skuPhanLoai: string;
  name: string;
  size: string;
  color: string;
  category: string;
  filter: string;
  rsp: number;
  cogs: number;
}

export interface Competitor {
  title: string;
  priceVND: number;
  shopName: string;
  rating: number;
  soldCount: number;
  url?: string;
}

export type PricingTier = 'rsp' | 'minPrice' | 'kolPrice' | 'spike' | 'miniSpike' | 'bau' | 'cogs';

export interface QuizQuestion {
  id: string;
  productName: string;
  tier: PricingTier;
  correctValue: number;
  options: number[];
  questionText: string;
}

import { faker } from '@faker-js/faker';
import type { ProductImageKey } from '../../types/product';

export type SeedProduct = {
  id: string;
  category_id: string;
  name: string;
  sku: string;
  barcode: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  image_key?: ProductImageKey;
  is_active: 0 | 1;
  track_stock: 0 | 1;
  allow_negative_stock: 0 | 1;
  created_at: string;
  updated_at: string;
};

// category_id placeholder — resolved at runtime by seed-products.ts
const C = {
  SEMBAKO: 'SEMBAKO',
  MINUMAN: 'MINUMAN',
  ROKOK: 'ROKOK',
  MIE: 'MIE',
  SNACK: 'SNACK',
  KOPI: 'KOPI',
  SABUN: 'SABUN',
  OBAT: 'OBAT',
  PULSA: 'PULSA',
  LAINNYA: 'LAINNYA',
};

const now = new Date().toISOString();
const id = () => faker.string.nanoid(10);
const sku = (prefix: string) => `${prefix}-${faker.string.alphanumeric(5).toUpperCase()}`;
const barcode = () => faker.string.numeric(13);
const price = (cost: number, margin = 0.2) => Math.round(cost * (1 + margin) / 500) * 500;

const CATEGORY_IMAGE_KEYS: Record<string, ProductImageKey> = {
  [C.SEMBAKO]: 'sembako',
  [C.MINUMAN]: 'minuman',
  [C.ROKOK]: 'rokok',
  [C.MIE]: 'mie',
  [C.SNACK]: 'snack',
  [C.KOPI]: 'kopi',
  [C.SABUN]: 'sabun',
  [C.OBAT]: 'obat',
  [C.PULSA]: 'pulsa',
  [C.LAINNYA]: 'default',
};

export function getImageKeyForCategory(categoryId: string): ProductImageKey {
  return CATEGORY_IMAGE_KEYS[categoryId] ?? 'default';
}

export const SEED_PRODUCTS: SeedProduct[] = [
  // SEMBAKO (5)
  { id: id(), category_id: C.SEMBAKO, name: 'Beras Premium 5kg', sku: sku('BRS'), barcode: barcode(), cost_price: 62000, sell_price: 68000, stock: 50, min_stock: 10, unit: 'kg', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.SEMBAKO, name: 'Minyak Goreng Bimoli 2L', sku: sku('MNY'), barcode: barcode(), cost_price: 28000, sell_price: 32000, stock: 30, min_stock: 5, unit: 'botol', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.SEMBAKO, name: 'Gula Pasir 1kg', sku: sku('GLA'), barcode: barcode(), cost_price: 14000, sell_price: 16000, stock: 40, min_stock: 10, unit: 'kg', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.SEMBAKO, name: 'Tepung Terigu Segitiga 1kg', sku: sku('TPG'), barcode: barcode(), cost_price: 10000, sell_price: 12000, stock: 25, min_stock: 5, unit: 'kg', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.SEMBAKO, name: 'Telur Ayam 1kg', sku: sku('TLR'), barcode: barcode(), cost_price: 24000, sell_price: 27000, stock: 20, min_stock: 5, unit: 'kg', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },

  // MINUMAN (5)
  { id: id(), category_id: C.MINUMAN, name: 'Aqua 600ml', sku: sku('AQA'), barcode: barcode(), cost_price: 2500, sell_price: 3500, stock: 100, min_stock: 20, unit: 'botol', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.MINUMAN, name: 'Teh Botol Sosro 450ml', sku: sku('TBS'), barcode: barcode(), cost_price: 4000, sell_price: 5000, stock: 60, min_stock: 12, unit: 'botol', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.MINUMAN, name: 'Pocari Sweat 500ml', sku: sku('PCS'), barcode: barcode(), cost_price: 7000, sell_price: 9000, stock: 40, min_stock: 10, unit: 'botol', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.MINUMAN, name: 'Coca-Cola 390ml', sku: sku('CCL'), barcode: barcode(), cost_price: 5500, sell_price: 7000, stock: 48, min_stock: 12, unit: 'kaleng', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.MINUMAN, name: 'Susu Ultra Milk 250ml', sku: sku('SUM'), barcode: barcode(), cost_price: 4500, sell_price: 6000, stock: 36, min_stock: 10, unit: 'kotak', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },

  // ROKOK (4)
  { id: id(), category_id: C.ROKOK, name: 'Gudang Garam Surya 12', sku: sku('GGS'), barcode: barcode(), cost_price: 22000, sell_price: 25000, stock: 30, min_stock: 5, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.ROKOK, name: 'Sampoerna Mild 16', sku: sku('SML'), barcode: barcode(), cost_price: 24000, sell_price: 27000, stock: 25, min_stock: 5, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.ROKOK, name: 'Djarum Super 12', sku: sku('DJS'), barcode: barcode(), cost_price: 21000, sell_price: 24000, stock: 20, min_stock: 5, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.ROKOK, name: 'LA Bold 16', sku: sku('LAB'), barcode: barcode(), cost_price: 23000, sell_price: 26000, stock: 15, min_stock: 5, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },

  // MIE (3)
  { id: id(), category_id: C.MIE, name: 'Indomie Goreng', sku: sku('IMG'), barcode: barcode(), cost_price: 2800, sell_price: 3500, stock: 80, min_stock: 20, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.MIE, name: 'Indomie Kuah Ayam Bawang', sku: sku('IKA'), barcode: barcode(), cost_price: 2800, sell_price: 3500, stock: 80, min_stock: 20, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.MIE, name: 'Mie Sedaap Goreng', sku: sku('MSG'), barcode: barcode(), cost_price: 2600, sell_price: 3500, stock: 60, min_stock: 15, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },

  // SNACK (4)
  { id: id(), category_id: C.SNACK, name: 'Chitato Sapi Panggang 68g', sku: sku('CTS'), barcode: barcode(), cost_price: 8000, sell_price: 10000, stock: 30, min_stock: 10, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.SNACK, name: 'Taro Net 65g', sku: sku('TRN'), barcode: barcode(), cost_price: 7000, sell_price: 9000, stock: 25, min_stock: 8, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.SNACK, name: 'Oreo Original 137g', sku: sku('ORO'), barcode: barcode(), cost_price: 12000, sell_price: 15000, stock: 20, min_stock: 5, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.SNACK, name: 'Wafer Tango 130g', sku: sku('WFT'), barcode: barcode(), cost_price: 9000, sell_price: 11000, stock: 18, min_stock: 5, unit: 'bungkus', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },

  // KOPI (3)
  { id: id(), category_id: C.KOPI, name: 'Kopi Kapal Api Sachet', sku: sku('KKA'), barcode: barcode(), cost_price: 1200, sell_price: 1500, stock: 100, min_stock: 30, unit: 'sachet', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.KOPI, name: 'Nescafe Classic Sachet', sku: sku('NFC'), barcode: barcode(), cost_price: 1500, sell_price: 2000, stock: 80, min_stock: 20, unit: 'sachet', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.KOPI, name: 'Good Day Cappuccino Sachet', sku: sku('GDC'), barcode: barcode(), cost_price: 1300, sell_price: 1500, stock: 90, min_stock: 20, unit: 'sachet', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },

  // SABUN (3)
  { id: id(), category_id: C.SABUN, name: 'Sabun Lifebuoy 85g', sku: sku('SBL'), barcode: barcode(), cost_price: 4000, sell_price: 5500, stock: 30, min_stock: 8, unit: 'buah', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.SABUN, name: 'Shampo Pantene 170ml', sku: sku('SHP'), barcode: barcode(), cost_price: 18000, sell_price: 22000, stock: 20, min_stock: 5, unit: 'botol', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.SABUN, name: 'Rinso Cair 800ml', sku: sku('RNC'), barcode: barcode(), cost_price: 22000, sell_price: 26000, stock: 15, min_stock: 5, unit: 'botol', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },

  // OBAT (3)
  { id: id(), category_id: C.OBAT, name: 'Paracetamol 500mg Strip', sku: sku('PCT'), barcode: barcode(), cost_price: 3000, sell_price: 5000, stock: 20, min_stock: 5, unit: 'strip', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.OBAT, name: 'Antangin JRG Sachet', sku: sku('ATG'), barcode: barcode(), cost_price: 2500, sell_price: 4000, stock: 15, min_stock: 5, unit: 'sachet', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.OBAT, name: 'Tolak Angin Cair Sachet', sku: sku('TLA'), barcode: barcode(), cost_price: 3000, sell_price: 5000, stock: 12, min_stock: 5, unit: 'sachet', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },

  // PULSA (2)
  { id: id(), category_id: C.PULSA, name: 'Pulsa Telkomsel 10rb', sku: sku('PLT'), barcode: barcode(), cost_price: 9500, sell_price: 11000, stock: 999, min_stock: 0, unit: 'pcs', is_active: 1, track_stock: 0, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.PULSA, name: 'Pulsa Indosat 20rb', sku: sku('PLI'), barcode: barcode(), cost_price: 19000, sell_price: 21000, stock: 999, min_stock: 0, unit: 'pcs', is_active: 1, track_stock: 0, allow_negative_stock: 0, created_at: now, updated_at: now },

  // LAINNYA (3)
  { id: id(), category_id: C.LAINNYA, name: 'Korek Api Gas', sku: sku('KRK'), barcode: barcode(), cost_price: 2000, sell_price: 3000, stock: 50, min_stock: 10, unit: 'buah', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.LAINNYA, name: 'Kantong Plastik 1/2kg', sku: sku('KPL'), barcode: barcode(), cost_price: 5000, sell_price: 7000, stock: 30, min_stock: 5, unit: 'pack', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
  { id: id(), category_id: C.LAINNYA, name: 'Tisu Paseo 250 Sheet', sku: sku('TSP'), barcode: barcode(), cost_price: 9000, sell_price: 12000, stock: 20, min_stock: 5, unit: 'pack', is_active: 1, track_stock: 1, allow_negative_stock: 0, created_at: now, updated_at: now },
];

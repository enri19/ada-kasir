export const CREATE_STORES_TABLE = `
  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_name TEXT,
    phone TEXT,
    address TEXT,
    receipt_note TEXT,
    logo_uri TEXT,
    qris_image_uri TEXT,
    qris_name TEXT,
    qris_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const CREATE_CATEGORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const CREATE_PRODUCTS_TABLE = `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT,
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    cost_price INTEGER NOT NULL DEFAULT 0,
    sell_price INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 0,
    track_stock INTEGER NOT NULL DEFAULT 1,
    allow_negative_stock INTEGER NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'pcs',
    image_uri TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );
`;

export const CREATE_CUSTOMERS_TABLE = `
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

export const CREATE_SALES_TABLE = `
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id TEXT,
    total_amount INTEGER NOT NULL DEFAULT 0,
    paid_amount INTEGER NOT NULL DEFAULT 0,
    change_amount INTEGER NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    status TEXT NOT NULL DEFAULT 'paid',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  );
`;

export const CREATE_SALE_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    price INTEGER NOT NULL DEFAULT 0,
    cost_price INTEGER NOT NULL DEFAULT 0,
    subtotal INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
  );
`;

export const CREATE_DEBTS_TABLE = `
  CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    sale_id TEXT,
    amount INTEGER NOT NULL DEFAULT 0,
    paid_amount INTEGER NOT NULL DEFAULT 0,
    remaining_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid',
    due_date TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL
  );
`;

export const CREATE_DEBT_PAYMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS debt_payments (
    id TEXT PRIMARY KEY,
    debt_id TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
  );
`;

export const CREATE_STOCK_MOVEMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL,
    qty INTEGER NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    reference_id TEXT,
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );
`;

export const ALL_MIGRATIONS = [
  CREATE_STORES_TABLE,
  CREATE_CATEGORIES_TABLE,
  CREATE_PRODUCTS_TABLE,
  CREATE_CUSTOMERS_TABLE,
  CREATE_SALES_TABLE,
  CREATE_SALE_ITEMS_TABLE,
  CREATE_DEBTS_TABLE,
  CREATE_DEBT_PAYMENTS_TABLE,
  CREATE_STOCK_MOVEMENTS_TABLE,
  'ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE stores ADD COLUMN qris_image_uri TEXT',
  'ALTER TABLE stores ADD COLUMN qris_name TEXT',
  'ALTER TABLE stores ADD COLUMN qris_note TEXT',
  'ALTER TABLE products ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE products ADD COLUMN track_stock INTEGER NOT NULL DEFAULT 1',
  'ALTER TABLE products ADD COLUMN allow_negative_stock INTEGER NOT NULL DEFAULT 1',
];

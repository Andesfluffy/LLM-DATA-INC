-- Seed demo data: products and sales
-- Creates tables if missing and inserts a few sample rows

-- Tables
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  region TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL
);

-- Clear existing demo rows (optional)
-- DELETE FROM sales;
-- DELETE FROM products;

-- Sample products
INSERT INTO products (sku, name, category, price) VALUES
  ('P-100', 'Acme Widget', 'Widgets', 19.99),
  ('P-200', 'Gizmo Pro', 'Gizmos', 49.50),
  ('P-300', 'Doodad Mini', 'Doodads', 9.75)
ON CONFLICT (sku) DO NOTHING;

-- Map SKUs to IDs for consistent foreign keys
WITH p AS (
  SELECT sku, id, price FROM products WHERE sku IN ('P-100','P-200','P-300')
)
INSERT INTO sales (order_id, product_id, qty, unit_price, region, occurred_at)
VALUES
  -- ~27 days ago
  ('ORD-0001', (SELECT id FROM p WHERE sku='P-100'), 2, (SELECT price FROM p WHERE sku='P-100'), 'NA', now() - interval '27 days'),
  -- ~20 days ago
  ('ORD-0002', (SELECT id FROM p WHERE sku='P-200'), 1, (SELECT price FROM p WHERE sku='P-200'), 'EU', now() - interval '20 days'),
  -- ~13 days ago
  ('ORD-0003', (SELECT id FROM p WHERE sku='P-300'), 5, (SELECT price FROM p WHERE sku='P-300'), 'APAC', now() - interval '13 days'),
  -- ~7 days ago
  ('ORD-0004', (SELECT id FROM p WHERE sku='P-100'), 1, (SELECT price FROM p WHERE sku='P-100'), 'NA', now() - interval '7 days'),
  -- ~2 days ago
  ('ORD-0005', (SELECT id FROM p WHERE sku='P-200'), 3, (SELECT price FROM p WHERE sku='P-200'), 'EU', now() - interval '2 days')
ON CONFLICT DO NOTHING;

-- Helpful indexes (optional for analytics)
-- CREATE INDEX IF NOT EXISTS sales_occurred_at_idx ON sales(occurred_at);
-- CREATE INDEX IF NOT EXISTS sales_product_id_idx ON sales(product_id);


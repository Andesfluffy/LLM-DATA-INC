/**
 * Seed script — creates a demo e-commerce dataset in the connected PostgreSQL.
 *
 * Run:  npx tsx prisma/seed.ts
 *
 * Tables created: customers, products, orders, order_items
 */

import { Client } from "pg";

const DATABASE_URL = process.env.DEMO_DATASOURCE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("Set DATABASE_URL or DEMO_DATASOURCE_URL");
  process.exit(1);
}

async function seed() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("Creating demo tables...");

  await client.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      region TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      stock INT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_id INT REFERENCES customers(id),
      status TEXT NOT NULL DEFAULT 'pending',
      total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INT REFERENCES orders(id),
      product_id INT REFERENCES products(id),
      quantity INT NOT NULL DEFAULT 1,
      unit_price NUMERIC(10,2) NOT NULL
    );
  `);

  // Clear existing demo data
  await client.query(`
    TRUNCATE order_items, orders, products, customers RESTART IDENTITY CASCADE;
  `);

  // Customers
  const customers = [
    ["Alice Johnson", "alice@example.com", "North America"],
    ["Bob Smith", "bob@example.com", "Europe"],
    ["Carlos Rivera", "carlos@example.com", "South America"],
    ["Diana Chen", "diana@example.com", "Asia Pacific"],
    ["Eve Williams", "eve@example.com", "North America"],
    ["Frank Mueller", "frank@example.com", "Europe"],
    ["Grace Kim", "grace@example.com", "Asia Pacific"],
    ["Hassan Ali", "hassan@example.com", "Middle East"],
    ["Iris Nakamura", "iris@example.com", "Asia Pacific"],
    ["Jake Thompson", "jake@example.com", "North America"],
  ];
  for (const [name, email, region] of customers) {
    await client.query(
      `INSERT INTO customers (name, email, region) VALUES ($1, $2, $3)`,
      [name, email, region],
    );
  }

  // Products
  const products = [
    ["Wireless Mouse", "Electronics", 29.99, 150],
    ["Mechanical Keyboard", "Electronics", 89.99, 75],
    ["USB-C Hub", "Electronics", 49.99, 200],
    ["Standing Desk", "Furniture", 499.99, 30],
    ["Ergonomic Chair", "Furniture", 349.99, 45],
    ["Monitor Arm", "Furniture", 79.99, 120],
    ["Noise-Canceling Headphones", "Audio", 199.99, 60],
    ["Webcam HD", "Electronics", 69.99, 90],
    ["Desk Lamp", "Accessories", 39.99, 180],
    ["Cable Management Kit", "Accessories", 19.99, 300],
    ["Laptop Stand", "Accessories", 59.99, 110],
    ["Bluetooth Speaker", "Audio", 49.99, 140],
  ];
  for (const [name, category, price, stock] of products) {
    await client.query(
      `INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4)`,
      [name, category, price, stock],
    );
  }

  // Orders — spread across the last 90 days
  const statuses = ["completed", "completed", "completed", "shipped", "pending", "cancelled"];
  const orderCount = 50;

  for (let i = 0; i < orderCount; i++) {
    const customerId = (i % customers.length) + 1;
    const daysAgo = Math.floor(Math.random() * 90);
    const status = statuses[i % statuses.length];

    const itemCount = 1 + Math.floor(Math.random() * 3);
    let totalAmount = 0;
    const items: Array<{ productId: number; quantity: number; unitPrice: number }> = [];

    for (let j = 0; j < itemCount; j++) {
      const productId = 1 + Math.floor(Math.random() * products.length);
      const quantity = 1 + Math.floor(Math.random() * 3);
      const unitPrice = Number(products[productId - 1]![2]);
      totalAmount += unitPrice * quantity;
      items.push({ productId, quantity, unitPrice });
    }

    const res = await client.query(
      `INSERT INTO orders (customer_id, status, total_amount, created_at)
       VALUES ($1, $2, $3, now() - interval '${daysAgo} days')
       RETURNING id`,
      [customerId, status, totalAmount.toFixed(2)],
    );
    const orderId = res.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.productId, item.quantity, item.unitPrice],
      );
    }
  }

  console.log(`Seeded: ${customers.length} customers, ${products.length} products, ${orderCount} orders`);

  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

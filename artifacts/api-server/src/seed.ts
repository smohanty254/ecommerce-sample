import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { db, pool, usersTable, categoriesTable, productsTable, ordersTable, orderItemsTable, reviewsTable, notificationsTable, cartsTable, cartItemsTable, formSchemasTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const CATEGORIES = [
  { name: "Electronics", slug: "electronics", description: "Latest gadgets and devices", imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400" },
  { name: "Clothing", slug: "clothing", description: "Fashion for everyone", imageUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=400" },
  { name: "Home & Garden", slug: "home-garden", description: "Everything for your home", imageUrl: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400" },
  { name: "Sports", slug: "sports", description: "Sports and outdoor gear", imageUrl: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400" },
  { name: "Books", slug: "books", description: "Knowledge and entertainment", imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400" },
  { name: "Beauty", slug: "beauty", description: "Beauty and personal care", imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400" },
  { name: "Toys", slug: "toys", description: "Fun for all ages", imageUrl: "https://images.unsplash.com/photo-1558877385-81a1c7e67d72?w=400" },
  { name: "Food & Grocery", slug: "food-grocery", description: "Everyday essentials", imageUrl: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400" },
];

const PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400",
  "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400",
  "https://images.unsplash.com/photo-1560472355-536de3962603?w=400",
  "https://images.unsplash.com/photo-1567581935884-3349723552ca?w=400",
  "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
  "https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=400",
];

async function seed() {
  console.log("Starting seed...");

  const passwordHash = await bcrypt.hash("password123", 10);

  await db.insert(usersTable).values({
    email: "admin@ecostore.com",
    name: "Admin User",
    role: "admin",
    passwordHash,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
    isActive: true,
  }).onConflictDoNothing();

  await db.insert(usersTable).values({
    email: "manager@ecostore.com",
    name: "Store Manager",
    role: "manager",
    passwordHash,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=manager",
    isActive: true,
  }).onConflictDoNothing();

  await db.insert(usersTable).values({
    email: "customer@ecostore.com",
    name: "Demo Customer",
    role: "customer",
    passwordHash,
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=customer",
    isActive: true,
  }).onConflictDoNothing();

  console.log("Seeding 500 users...");
  const userBatch = Array.from({ length: 500 }, () => ({
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: "customer" as const,
    passwordHash,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${faker.string.alphanumeric(8)}`,
    phone: faker.phone.number(),
    address: faker.location.streetAddress(true),
    isActive: faker.datatype.boolean({ probability: 0.95 }),
  }));

  const insertedUsers: { id: number }[] = [];
  for (let i = 0; i < userBatch.length; i += 100) {
    const result = await db.insert(usersTable).values(userBatch.slice(i, i + 100)).onConflictDoNothing().returning({ id: usersTable.id });
    insertedUsers.push(...result);
  }
  console.log(`Seeded ${insertedUsers.length} users`);

  console.log("Seeding categories...");
  let insertedCategories = await db.insert(categoriesTable).values(CATEGORIES).onConflictDoNothing().returning();
  if (insertedCategories.length === 0) {
    insertedCategories = await db.select().from(categoriesTable);
  }
  console.log(`Categories: ${insertedCategories.length}`);

  console.log("Seeding 2000 products...");
  const productBatch = Array.from({ length: 2000 }, (_, i) => {
    const category = insertedCategories[Math.floor(Math.random() * insertedCategories.length)]!;
    const price = parseFloat(faker.commerce.price({ min: 5, max: 2000 }));
    const hasDiscount = Math.random() > 0.6;
    const baseName = faker.commerce.productName();
    const slug = `${baseName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`;
    return {
      name: baseName,
      slug,
      description: faker.commerce.productDescription(),
      price: String(price),
      compareAtPrice: hasDiscount ? String(Math.round(price * 1.2 * 100) / 100) : null,
      stock: faker.number.int({ min: 0, max: 500 }),
      sku: faker.string.alphanumeric(10).toUpperCase(),
      imageUrl: PRODUCT_IMAGES[Math.floor(Math.random() * PRODUCT_IMAGES.length)]!,
      images: [PRODUCT_IMAGES[Math.floor(Math.random() * PRODUCT_IMAGES.length)]!],
      categoryId: category.id,
      isFeatured: Math.random() > 0.85,
      tags: faker.helpers.arrayElements(["sale", "new", "popular", "trending", "limited", "eco-friendly"], { min: 0, max: 3 }),
    };
  });

  const insertedProducts: { id: number; categoryId: number; price: string }[] = [];
  for (let i = 0; i < productBatch.length; i += 200) {
    const result = await db.insert(productsTable).values(productBatch.slice(i, i + 200)).onConflictDoNothing().returning({ id: productsTable.id, categoryId: productsTable.categoryId, price: productsTable.price });
    insertedProducts.push(...result);
    process.stdout.write(`\r  Products: ${Math.min(i + 200, productBatch.length)}/${productBatch.length}`);
  }
  console.log(`\nSeeded ${insertedProducts.length} products`);

  console.log("Seeding 5000 orders...");
  const allUserIds = insertedUsers.map((u) => u.id);
  const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;

  for (let batch = 0; batch < 50; batch++) {
    const orderValues = Array.from({ length: 100 }, () => {
      const userId = allUserIds[Math.floor(Math.random() * allUserIds.length)] ?? 1;
      const itemCount = faker.number.int({ min: 1, max: 5 });
      const selectedProducts = Array.from({ length: itemCount }, () =>
        insertedProducts[Math.floor(Math.random() * insertedProducts.length)]
      ).filter(Boolean) as { id: number; price: string }[];
      const quantities = selectedProducts.map(() => faker.number.int({ min: 1, max: 10 }));
      const total = selectedProducts.reduce((acc, p, idx) => acc + Number(p.price) * (quantities[idx] ?? 1), 0);
      const createdAt = faker.date.between({ from: new Date("2023-01-01"), to: new Date() });
      return {
        order: {
          userId,
          status: STATUSES[Math.floor(Math.random() * STATUSES.length)]!,
          total: String(Math.round(total * 100) / 100),
          shippingAddress: faker.location.streetAddress(true),
          paymentMethod: faker.helpers.arrayElement(["credit_card", "paypal", "bank_transfer"]),
          createdAt,
          updatedAt: createdAt,
        },
        selectedProducts,
        quantities,
      };
    });

    for (const { order, selectedProducts, quantities } of orderValues) {
      const [inserted] = await db.insert(ordersTable).values(order as unknown as typeof ordersTable.$inferInsert).returning({ id: ordersTable.id });
      if (inserted && selectedProducts.length > 0) {
        const items = selectedProducts.map((p, idx) => ({
          orderId: inserted.id,
          productId: p.id,
          productName: `Product ${p.id}`,
          price: p.price,
          quantity: quantities[idx] ?? 1,
          imageUrl: PRODUCT_IMAGES[Math.floor(Math.random() * PRODUCT_IMAGES.length)]!,
        }));
        await db.insert(orderItemsTable).values(items);
      }
    }
    process.stdout.write(`\r  Orders: ${(batch + 1) * 100}/5000`);
  }
  console.log(`\nSeeded 5000 orders`);

  console.log("Seeding 10000 reviews...");
  const reviewBatch = Array.from({ length: 10000 }, () => ({
    productId: insertedProducts[Math.floor(Math.random() * insertedProducts.length)]?.id ?? 1,
    userId: allUserIds[Math.floor(Math.random() * allUserIds.length)] ?? 1,
    rating: faker.number.int({ min: 1, max: 5 }),
    title: Math.random() > 0.3 ? faker.lorem.sentence({ min: 3, max: 8 }) : null,
    body: Math.random() > 0.2 ? faker.lorem.paragraph({ min: 1, max: 3 }) : null,
    isVerified: faker.datatype.boolean({ probability: 0.6 }),
  }));
  for (let i = 0; i < reviewBatch.length; i += 500) {
    await db.insert(reviewsTable).values(reviewBatch.slice(i, i + 500));
    process.stdout.write(`\r  Reviews: ${Math.min(i + 500, reviewBatch.length)}/${reviewBatch.length}`);
  }
  console.log(`\nSeeded ${reviewBatch.length} reviews`);

  console.log("Seeding notifications...");
  const [adminRow] = await db.select({ id: usersTable.id }).from(usersTable).where(sql`email = 'admin@ecostore.com'`);
  const adminId = adminRow?.id ?? 1;
  const notifTypes = ["order_placed", "order_shipped", "order_delivered", "low_stock", "new_review", "system"] as const;
  const notifBatch = Array.from({ length: 200 }, () => ({
    userId: adminId,
    type: notifTypes[Math.floor(Math.random() * notifTypes.length)]!,
    title: faker.lorem.sentence({ min: 3, max: 6 }),
    message: faker.lorem.sentence({ min: 5, max: 12 }),
    isRead: faker.datatype.boolean({ probability: 0.4 }),
    metadata: {},
  }));
  await db.insert(notificationsTable).values(notifBatch);
  console.log("Seeded notifications");

  console.log("Seeding form schema...");
  await db.insert(formSchemasTable).values({
    name: "Product Feedback Form",
    description: "Collect customer feedback on products",
    fields: [
      { id: "f1", type: "text", label: "Your Name", placeholder: "Enter your name", required: true, order: 0, options: [], rules: [] },
      { id: "f2", type: "email", label: "Email Address", placeholder: "your@email.com", required: true, order: 1, options: [], rules: [] },
      { id: "f3", type: "select", label: "Rating", required: true, order: 2, options: ["Excellent", "Good", "Average", "Poor"], rules: [] },
      { id: "f4", type: "textarea", label: "Comments", placeholder: "Share your thoughts...", required: false, order: 3, options: [], rules: [{ condition: { field: "f3", operator: "equals", value: "Poor" }, action: { type: "require", targetField: "f4" } }] },
      { id: "f5", type: "number", label: "Price paid ($)", required: false, order: 4, options: [], rules: [] },
      { id: "f6", type: "formula", label: "Estimated value", formula: "{f5} * 1.1", required: false, order: 5, options: [], rules: [] },
    ] as unknown as Record<string, unknown>[],
    isPublished: true,
  });
  console.log("Seeded form schema");

  await pool.end();
  console.log("\n✅ Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

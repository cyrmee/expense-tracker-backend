import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      hash: await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64MB
        timeCost: 3, // number of iterations
        parallelism: 1, // degree of parallelism
      }),
      isVerified: false,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      name: 'Jane Doe',
      hash: await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      }),
      isVerified: true,
    },
  });

  // Create additional users with different spending patterns

  // User 3: High spender on entertainment and travel
  const user3 = await prisma.user.upsert({
    where: { email: 'michael@example.com' },
    update: {},
    create: {
      email: 'michael@example.com',
      name: 'Michael Smith',
      hash: await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      }),
      isVerified: true,
    },
  });

  // User 4: Budget-conscious, high on essentials, low on entertainment
  const user4 = await prisma.user.upsert({
    where: { email: 'emily@example.com' },
    update: {},
    create: {
      email: 'emily@example.com',
      name: 'Emily Johnson',
      hash: await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      }),
      isVerified: true,
    },
  });

  // User 5: High on shopping and subscriptions
  const user5 = await prisma.user.upsert({
    where: { email: 'david@example.com' },
    update: {},
    create: {
      email: 'david@example.com',
      name: 'David Wilson',
      hash: await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      }),
      isVerified: false,
    },
  });

  // User 6: Strong focus on education and health, minimal on entertainment
  const user6 = await prisma.user.upsert({
    where: { email: 'sarah@example.com' },
    update: {},
    create: {
      email: 'sarah@example.com',
      name: 'Sarah Brown',
      hash: await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      }),
      isVerified: true,
    },
  });

  // User 7: Food lover, high spending on dining
  const user7 = await prisma.user.upsert({
    where: { email: 'alex@example.com' },
    update: {},
    create: {
      email: 'alex@example.com',
      name: 'Alex Martinez',
      hash: await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      }),
      isVerified: true,
    },
  });
  // Create default categories
  const defaultCategories = [
    { id: uuidv4(), name: 'Food & Dining', icon: '🍴', isDefault: true },
    {
      id: uuidv4(),
      name: 'Transportation',
      icon: '🚗',
      isDefault: true,
    },
    { id: uuidv4(), name: 'Housing', icon: '🏠', isDefault: true },
    { id: uuidv4(), name: 'Utilities', icon: '⚡', isDefault: true },
    { id: uuidv4(), name: 'Internet', icon: '📶', isDefault: true },
    { id: uuidv4(), name: 'Subscriptions', icon: '🔄', isDefault: true },
    { id: uuidv4(), name: 'Entertainment', icon: '🎬', isDefault: true },
    { id: uuidv4(), name: 'Shopping', icon: '🛍️', isDefault: true },
    { id: uuidv4(), name: 'Health & Fitness', icon: '❤️', isDefault: true },
    { id: uuidv4(), name: 'Education', icon: '🎓', isDefault: true },
    { id: uuidv4(), name: 'Gifts & Donations', icon: '🎁', isDefault: true },
    { id: uuidv4(), name: 'Travel & Vacation', icon: '✈️', isDefault: true },
  ];

  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    });
  }
  const customCategory = await prisma.category.create({
    data: {
      id: uuidv4(),
      name: 'Hobbies',
      icon: '🎨',
      isDefault: false,
      userId: user2.id,
    },
  });
  // Create custom categories for the new users
  const techCategory = await prisma.category.create({
    data: {
      id: uuidv4(),
      name: 'Technology',
      icon: '💻',
      isDefault: false,
      userId: user3.id,
    },
  });

  const petsCategory = await prisma.category.create({
    data: {
      id: uuidv4(),
      name: 'Pet Expenses',
      icon: '🐾',
      isDefault: false,
      userId: user4.id,
    },
  });

  const luxuryCategory = await prisma.category.create({
    data: {
      id: uuidv4(),
      name: 'Luxury Items',
      icon: '💎',
      isDefault: false,
      userId: user5.id,
    },
  });
  // Create money sources
  const user1Cash = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Cash',
      balance: 500,
      currency: 'USD',
      icon: '💵',
      isDefault: true,
      budget: 1500,
      userId: user1.id,
    },
  });
  const user1Bank = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Bank Account',
      balance: 3500,
      currency: 'USD',
      icon: '🏦',
      isDefault: false,
      budget: 4000,
      userId: user1.id,
    },
  });
  const user2Cash = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Cash',
      balance: 800,
      currency: 'USD',
      icon: '💵',
      isDefault: true,
      budget: 1200,
      userId: user2.id,
    },
  });

  const user2CreditCard = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Credit Card',
      balance: -250,
      currency: 'USD',
      icon: '💳',
      isDefault: false,
      budget: 1000,
      userId: user2.id,
    },
  });
  // User 3 money sources
  const user3Cash = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Cash',
      balance: 800,
      currency: 'USD',
      icon: '💵',
      isDefault: false,
      budget: 1000,
      userId: user3.id,
    },
  });

  const user3Bank = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Checking Account',
      balance: 5200,
      currency: 'USD',
      icon: '🏦',
      isDefault: true,
      budget: 6000,
      userId: user3.id,
    },
  });

  await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Savings',
      balance: 15000,
      currency: 'USD',
      icon: '💰',
      isDefault: false,
      budget: 0,
      userId: user3.id,
    },
  });
  // User 4 money sources
  const user4Cash = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Cash',
      balance: 300,
      currency: 'USD',
      icon: '💵',
      isDefault: false,
      budget: 400,
      userId: user4.id,
    },
  });

  const user4Bank = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Bank Account',
      balance: 2100,
      currency: 'USD',
      icon: '🏦',
      isDefault: true,
      budget: 2500,
      userId: user4.id,
    },
  });
  // User 5 money sources
  const user5Cash = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Cash',
      balance: 150,
      currency: 'USD',
      icon: '💵',
      isDefault: false,
      budget: 200,
      userId: user5.id,
    },
  });

  const user5Bank = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Checking',
      balance: 1800,
      currency: 'USD',
      icon: '🏦',
      isDefault: true,
      budget: 2000,
      userId: user5.id,
    },
  });

  const user5CreditCard = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Credit Card',
      balance: -2500,
      currency: 'USD',
      icon: '💳',
      isDefault: false,
      budget: 3000,
      userId: user5.id,
    },
  });
  // User 6 money sources
  const user6Bank = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Bank Account',
      balance: 4300,
      currency: 'USD',
      icon: '🏦',
      isDefault: true,
      budget: 4500,
      userId: user6.id,
    },
  });
  // User 7 money sources
  const user7Cash = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Cash',
      balance: 420,
      currency: 'USD',
      icon: '💵',
      isDefault: true,
      budget: 500,
      userId: user7.id,
    },
  });

  const user7Bank = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Checking Account',
      balance: 3200,
      currency: 'USD',
      icon: '🏦',
      isDefault: false,
      budget: 3500,
      userId: user7.id,
    },
  });

  const user7CreditCard = await prisma.moneySource.create({
    data: {
      id: uuidv4(),
      name: 'Credit Card',
      balance: -750,
      currency: 'USD',
      icon: '💳',
      isDefault: false,
      budget: 1000,
      userId: user7.id,
    },
  });

  // Create expenses for User 1
  const now = new Date();
  const lastMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate(),
  );
  const twoMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 2,
    now.getDate(),
  );  // Get category references to use UUIDs
  const foodCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Food & Dining' } });
  const transportationCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Transportation' } });
  const entertainmentCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Entertainment' } });
  const housingCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Housing' } });
  const utilitiesCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Utilities' } });
  await prisma.category.findFirstOrThrow({ where: { name: 'Internet' } });
  const subscriptionsCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Subscriptions' } });
  const shoppingCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Shopping' } });
  const healthCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Health & Fitness' } });
  const educationCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Education' } });
  await prisma.category.findFirstOrThrow({ where: { name: 'Gifts & Donations' } });
  const travelCategory = await prisma.category.findFirstOrThrow({ where: { name: 'Travel & Vacation' } });

  await prisma.expense.create({
    data: {
      amount: 45.5,
      date: now,
      notes: 'Grocery shopping',
      categoryId: foodCategory.id,
      moneySourceId: user1Cash.id,
      userId: user1.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 120,
      date: lastMonth,
      notes: 'Monthly transit pass',
      categoryId: transportationCategory.id,
      moneySourceId: user1Bank.id,
      userId: user1.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 65.75,
      date: twoMonthsAgo,
      notes: 'Concert tickets',
      categoryId: entertainmentCategory.id,
      moneySourceId: user1Bank.id,
      userId: user1.id,
    },
  });
  // Create expenses for User 2
  await prisma.expense.create({
    data: {
      amount: 32.4,
      date: now,
      notes: 'Dinner with friends',
      categoryId: foodCategory.id,
      moneySourceId: user2Cash.id,
      userId: user2.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 250,
      date: lastMonth,
      notes: 'New headphones',
      categoryId: shoppingCategory.id,
      moneySourceId: user2CreditCard.id,
      userId: user2.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 89.99,
      date: lastMonth,
      notes: 'Art supplies',
      categoryId: customCategory.id,
      moneySourceId: user2Cash.id,
      userId: user2.id,
    },
  });
  // Create expenses for User 3 (High entertainment and travel spender)
  await prisma.expense.create({
    data: {
      amount: 220.5,
      date: now,
      notes: 'Concert tickets',
      categoryId: entertainmentCategory.id,
      moneySourceId: user3Bank.id,
      userId: user3.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 89.99,
      date: now,
      notes: 'Streaming subscriptions',
      categoryId: subscriptionsCategory.id,
      moneySourceId: user3Bank.id,
      userId: user3.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 1250,
      date: lastMonth,
      notes: 'Weekend trip',
      categoryId: travelCategory.id,
      moneySourceId: user3Bank.id,
      userId: user3.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 350,
      date: lastMonth,
      notes: 'New smartphone',
      categoryId: techCategory.id,
      moneySourceId: user3Bank.id,
      userId: user3.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 75.5,
      date: twoMonthsAgo,
      notes: 'Dinner and movie',
      categoryId: entertainmentCategory.id,
      moneySourceId: user3Cash.id,
      userId: user3.id,
    },
  });

  // Create expenses for User 4 (Budget conscious)
  await prisma.expense.create({
    data: {
      amount: 32.45,
      date: now,
      notes: 'Grocery shopping',
      categoryId: foodCategory.id,
      moneySourceId: user4Cash.id,
      userId: user4.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 800,
      date: lastMonth,
      notes: 'Rent payment',
      categoryId: housingCategory.id,
      moneySourceId: user4Bank.id,
      userId: user4.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 120,
      date: lastMonth,
      notes: 'Utilities bill',
      categoryId: utilitiesCategory.id,
      moneySourceId: user4Bank.id,
      userId: user4.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 85.25,
      date: twoMonthsAgo,
      notes: 'Pet supplies and food',
      categoryId: petsCategory.id,
      moneySourceId: user4Cash.id,
      userId: user4.id,
    },
  });
  // Create expenses for User 5 (High shopping and subscriptions)
  await prisma.expense.create({
    data: {
      amount: 395,
      date: now,
      notes: 'Designer clothes',
      categoryId: shoppingCategory.id,
      moneySourceId: user5CreditCard.id,
      userId: user5.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 1200,
      date: lastMonth,
      notes: 'Designer handbag',
      categoryId: luxuryCategory.id,
      moneySourceId: user5CreditCard.id,
      userId: user5.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 59.99,
      date: lastMonth,
      notes: 'Streaming services',
      categoryId: subscriptionsCategory.id,
      moneySourceId: user5Bank.id,
      userId: user5.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 49.99,
      date: lastMonth,
      notes: 'Premium app subscriptions',
      categoryId: subscriptionsCategory.id,
      moneySourceId: user5Bank.id,
      userId: user5.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 120,
      date: twoMonthsAgo,
      notes: 'Online shopping - various items',
      categoryId: shoppingCategory.id,
      moneySourceId: user5Bank.id,
      userId: user5.id,
    },
  });
  // Create expenses for User 6 (Focus on education and health)
  await prisma.expense.create({
    data: {
      amount: 250,
      date: now,
      notes: 'Online course subscription',
      categoryId: educationCategory.id,
      moneySourceId: user6Bank.id,
      userId: user6.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 89,
      date: now,
      notes: 'Gym membership',
      categoryId: healthCategory.id,
      moneySourceId: user6Bank.id,
      userId: user6.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 135.5,
      date: lastMonth,
      notes: 'Health supplements',
      categoryId: healthCategory.id,
      moneySourceId: user6Bank.id,
      userId: user6.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 75,
      date: twoMonthsAgo,
      notes: 'Reference books',
      categoryId: educationCategory.id,
      moneySourceId: user6Bank.id,
      userId: user6.id,
    },
  });
  // Create expenses for User 7 (Food lover)
  await prisma.expense.create({
    data: {
      amount: 95.75,
      date: now,
      notes: 'Dinner at fine restaurant',
      categoryId: foodCategory.id,
      moneySourceId: user7CreditCard.id,
      userId: user7.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 120.3,
      date: now,
      notes: 'Specialty groceries',
      categoryId: foodCategory.id,
      moneySourceId: user7Bank.id,
      userId: user7.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 85.45,
      date: lastMonth,
      notes: 'Food delivery',
      categoryId: foodCategory.id,
      moneySourceId: user7CreditCard.id,
      userId: user7.id,
    },
  });
  await prisma.expense.create({
    data: {
      amount: 42,
      date: lastMonth,
      notes: 'Coffee and bakery',
      categoryId: foodCategory.id,
      moneySourceId: user7Cash.id,
      userId: user7.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 37.25,
      date: twoMonthsAgo,
      notes: 'Fast food',
      categoryId: foodCategory.id,
      moneySourceId: user7Cash.id,
      userId: user7.id,
    },
  });

  // Create balance history entries
  const oneWeekAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 7,
  );
  const twoWeeksAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 14,
  );

  await prisma.balanceHistory.create({
    data: {
      date: twoWeeksAgo,
      balance: 600,
      amount: 600, // Initial balance
      currency: 'USD',
      moneySourceId: user1Cash.id,
      userId: user1.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: oneWeekAgo,
      balance: 550,
      amount: -50, // Decreased by 50
      currency: 'USD',
      moneySourceId: user1Cash.id,
      userId: user1.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: now,
      balance: 500,
      amount: -50, // Decreased by 50
      currency: 'USD',
      moneySourceId: user1Cash.id,
      userId: user1.id,
    },
  });

  // Create balance history entries for new users
  await prisma.balanceHistory.create({
    data: {
      date: twoWeeksAgo,
      balance: 900,
      amount: 900, // Initial balance
      currency: 'USD',
      moneySourceId: user3Cash.id,
      userId: user3.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: now,
      balance: 800,
      amount: -100, // Decreased by 100
      currency: 'USD',
      moneySourceId: user3Cash.id,
      userId: user3.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: twoWeeksAgo,
      balance: 350,
      amount: 350, // Initial balance
      currency: 'USD',
      moneySourceId: user4Cash.id,
      userId: user4.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: now,
      balance: 300,
      amount: -50, // Decreased by 50
      currency: 'USD',
      moneySourceId: user4Cash.id,
      userId: user4.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: twoWeeksAgo,
      balance: 200,
      amount: 200, // Initial balance
      currency: 'USD',
      moneySourceId: user5Cash.id,
      userId: user5.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: now,
      balance: 150,
      amount: -50, // Decreased by 50
      currency: 'USD',
      moneySourceId: user5Cash.id,
      userId: user5.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: twoWeeksAgo,
      balance: 4500,
      amount: 4500, // Initial balance
      currency: 'USD',
      moneySourceId: user6Bank.id,
      userId: user6.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: now,
      balance: 4300,
      amount: -200, // Decreased by 200
      currency: 'USD',
      moneySourceId: user6Bank.id,
      userId: user6.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: twoWeeksAgo,
      balance: 500,
      amount: 500, // Initial balance
      currency: 'USD',
      moneySourceId: user7Cash.id,
      userId: user7.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: now,
      balance: 420,
      amount: -80, // Decreased by 80
      currency: 'USD',
      moneySourceId: user7Cash.id,
      userId: user7.id,
    },
  });

  // Create app settings for users
  await prisma.appSettings.create({
    data: {
      preferredCurrency: 'ETB',
      hideAmounts: false,
      themePreference: 'light',
      userId: user1.id,
    },
  });

  await prisma.appSettings.create({
    data: {
      preferredCurrency: 'ETB',
      hideAmounts: true,
      themePreference: 'dark',
      userId: user2.id,
    },
  });

  // Create app settings for new users
  await prisma.appSettings.create({
    data: {
      preferredCurrency: 'USD',
      hideAmounts: false,
      themePreference: 'dark',
      userId: user3.id,
    },
  });

  await prisma.appSettings.create({
    data: {
      preferredCurrency: 'USD',
      hideAmounts: true,
      themePreference: 'light',
      userId: user4.id,
    },
  });

  await prisma.appSettings.create({
    data: {
      preferredCurrency: 'EUR',
      hideAmounts: false,
      themePreference: 'dark',
      userId: user5.id,
    },
  });

  await prisma.appSettings.create({
    data: {
      preferredCurrency: 'USD',
      hideAmounts: false,
      themePreference: 'light',
      userId: user6.id,
    },
  });

  await prisma.appSettings.create({
    data: {
      preferredCurrency: 'USD',
      hideAmounts: false,
      themePreference: 'auto',
      userId: user7.id,
    },
  });

  console.log('Expense tracker seed data created successfully');
}

(async () => { // NOSONAR
  try {
    await main();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();

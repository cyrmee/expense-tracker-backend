import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      username: 'john_doe',
      name: 'John Doe',
      hash: await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64MB
        timeCost: 3, // number of iterations
        parallelism: 1, // degree of parallelism
      }),
      isVerified: true,
      twoFactorEnabled: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      username: 'jane_doe',
      name: 'Jane Doe',
      hash: await argon2.hash('password123', {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      }),
      isVerified: true,
      twoFactorEnabled: true,
    },
  });

  // Create default categories
  const defaultCategories = [
    { id: 'food', name: 'Food & Dining', icon: '🍴', isDefault: true },
    {
      id: 'transportation',
      name: 'Transportation',
      icon: '🚗',
      isDefault: true,
    },
    { id: 'housing', name: 'Housing', icon: '🏠', isDefault: true },
    { id: 'utilities', name: 'Utilities', icon: '⚡', isDefault: true },
    { id: 'internet', name: 'Internet', icon: '📶', isDefault: true },
    { id: 'subscriptions', name: 'Subscriptions', icon: '🔄', isDefault: true },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬', isDefault: true },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', isDefault: true },
    { id: 'health', name: 'Health & Fitness', icon: '❤️', isDefault: true },
    { id: 'education', name: 'Education', icon: '🎓', isDefault: true },
    { id: 'gifts', name: 'Gifts & Donations', icon: '🎁', isDefault: true },
    { id: 'travel', name: 'Travel & Vacation', icon: '✈️', isDefault: true },
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
      id: `hobby-${user2.id}`,
      name: 'Hobbies',
      icon: '🎨',
      isDefault: false,
      userId: user2.id,
    },
  });

  // Create money sources
  const user1Cash = await prisma.moneySource.create({
    data: {
      id: `cash-${user1.id}`,
      name: 'Cash',
      balance: 500,
      currency: 'USD',
      icon: '💵',
      isDefault: true,
      initialBalance: 1000,
      budget: 1500,
      userId: user1.id,
    },
  });

  const user1Bank = await prisma.moneySource.create({
    data: {
      id: `bank-${user1.id}`,
      name: 'Bank Account',
      balance: 3500,
      currency: 'USD',
      icon: '🏦',
      isDefault: false,
      initialBalance: 5000,
      budget: 4000,
      userId: user1.id,
    },
  });

  const user2Cash = await prisma.moneySource.create({
    data: {
      id: `cash-${user2.id}`,
      name: 'Cash',
      balance: 800,
      currency: 'USD',
      icon: '💵',
      isDefault: true,
      initialBalance: 1000,
      budget: 1200,
      userId: user2.id,
    },
  });

  const user2CreditCard = await prisma.moneySource.create({
    data: {
      id: `credit-${user2.id}`,
      name: 'Credit Card',
      balance: -250,
      currency: 'USD',
      icon: '💳',
      isDefault: false,
      initialBalance: 0,
      budget: 1000,
      userId: user2.id,
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
  );

  await prisma.expense.create({
    data: {
      amount: 45.5,
      date: now,
      notes: 'Grocery shopping',
      categoryId: 'food',
      moneySourceId: user1Cash.id,
      userId: user1.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 120,
      date: lastMonth,
      notes: 'Monthly transit pass',
      categoryId: 'transportation',
      moneySourceId: user1Bank.id,
      userId: user1.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 65.75,
      date: twoMonthsAgo,
      notes: 'Concert tickets',
      categoryId: 'entertainment',
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
      categoryId: 'food',
      moneySourceId: user2Cash.id,
      userId: user2.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 250,
      date: lastMonth,
      notes: 'New headphones',
      categoryId: 'shopping',
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
      currency: 'USD',
      moneySourceId: user1Cash.id,
      userId: user1.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: oneWeekAgo,
      balance: 550,
      currency: 'USD',
      moneySourceId: user1Cash.id,
      userId: user1.id,
    },
  });

  await prisma.balanceHistory.create({
    data: {
      date: now,
      balance: 500,
      currency: 'USD',
      moneySourceId: user1Cash.id,
      userId: user1.id,
    },
  });

  // Create app settings for users
  await prisma.appSettings.create({
    data: {
      preferredCurrency: 'USD',
      hideAmounts: false,
      useCustomETBRate: false,
      customETBtoUSDRate: 0.02,
      customUSDtoETBRate: 50,
      hasSeenWelcome: true,
      userName: 'John',
      hasExistingData: true,
      themePreference: 'light',
      userId: user1.id,
    },
  });

  await prisma.appSettings.create({
    data: {
      preferredCurrency: 'USD',
      hideAmounts: true,
      useCustomETBRate: false,
      customETBtoUSDRate: 0.02,
      customUSDtoETBRate: 50,
      hasSeenWelcome: true,
      userName: 'Jane',
      hasExistingData: true,
      themePreference: 'dark',
      userId: user2.id,
    },
  });

  console.log('Expense tracker seed data created successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

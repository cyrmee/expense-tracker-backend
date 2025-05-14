import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function seedCardStyles(prisma: PrismaClient) {
  const cardStyles = [
    {
      styleId: 'classic-blue',
      name: 'Classic Blue',
      background: JSON.stringify({ backgroundColor: '#1e40af' }),
      textColor: '#ffffff',
      cardNumberFont: 'monospace',
      border: 'none',
      shadow:
        '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      hasChip: true,
      chipColor: '#facc15',
      visaLogoVariant: 'white',
      showBgImage: false,
    },
    {
      styleId: 'modern-gradient',
      name: 'Modern Gradient',
      background: JSON.stringify({
        backgroundImage:
          'linear-gradient(to bottom right, #7c3aed, #ec4899, #ef4444)',
      }),
      textColor: '#ffffff',
      cardNumberFont: 'bold',
      border: 'none',
      shadow:
        '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      hasChip: true,
      chipColor: '#ffffff',
      visaLogoVariant: 'white',
      showBgImage: false,
    },
    {
      styleId: 'glassmorphic',
      name: 'Glassmorphic',
      background: JSON.stringify({
        backgroundColor: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      }),
      textColor: '#ffffff',
      cardNumberFont: '300',
      border: '1px solid rgba(255,255,255,0.2)',
      shadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      hasChip: true,
      chipColor: 'rgba(255,255,255,0.3)',
      visaLogoVariant: 'white',
      showBgImage: false,
    },
    {
      styleId: 'dark-mode',
      name: 'Dark Mode',
      background: JSON.stringify({ backgroundColor: '#171717' }),
      textColor: '#f5f5f5',
      cardNumberFont: 'monospace',
      border: '1px solid #374151',
      shadow: '0 4px 6px rgba(0,0,0,0.1)',
      hasChip: false,
      chipColor: '#4b5563',
      visaLogoVariant: 'white',
      showBgImage: false,
    },
    {
      styleId: 'luxury-black-gold',
      name: 'Luxury Black & Gold',
      background: JSON.stringify({ backgroundColor: '#000000' }),
      textColor: '#facc15',
      cardNumberFont: 'serif',
      border: '1px solid #f59e0b',
      shadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      hasChip: true,
      chipColor: '#facc15',
      visaLogoVariant: 'gold',
      showBgImage: false,
    },
    {
      styleId: 'nature-green',
      name: 'Nature Green',
      background: JSON.stringify({
        backgroundImage: 'linear-gradient(to right, #22c55e, #84cc16)',
      }),
      textColor: '#ffffff',
      cardNumberFont: '500',
      border: 'none',
      shadow: '0 10px 15px rgba(0,0,0,0.1)',
      hasChip: true,
      chipColor: '#ffffff',
      visaLogoVariant: 'white',
      showBgImage: false,
    },
    {
      styleId: 'retro-90s',
      name: 'Retro 90s',
      background: JSON.stringify({
        backgroundImage:
          'linear-gradient(to bottom right, #ec4899, #fde047, #22d3ee)',
      }),
      textColor: '#000000',
      cardNumberFont: 'monospace',
      border: '1px solid black',
      shadow: '0 10px 15px rgba(0,0,0,0.1)',
      hasChip: false,
      chipColor: '#f9a8d4',
      visaLogoVariant: 'black',
      showBgImage: false,
    },
    {
      styleId: 'cyberpunk-neon',
      name: 'Neon Cyberpunk',
      background: JSON.stringify({
        backgroundImage:
          'linear-gradient(to top right, #1e3a8a, #6b21a8, #db2777)',
      }),
      textColor: '#67e8f9',
      cardNumberFont: 'monospace',
      border: '1px solid #22d3ee',
      shadow: '0 0 20px rgba(103,232,249,0.8)',
      hasChip: true,
      chipColor: '#67e8f9',
      visaLogoVariant: 'neon',
      showBgImage: true,
    },
    {
      styleId: 'minimal-white',
      name: 'Minimal White',
      background: JSON.stringify({ backgroundColor: '#ffffff' }),
      textColor: '#111827',
      cardNumberFont: '300',
      border: '1px solid #e5e7eb',
      shadow: '0 1px 2px rgba(0,0,0,0.05)',
      hasChip: false,
      chipColor: '#d1d5db',
      visaLogoVariant: 'black',
      showBgImage: false,
    },
    {
      styleId: 'futuristic-holographic',
      name: 'Futuristic Holographic',
      background: JSON.stringify({
        backgroundImage: 'linear-gradient(to right, #818cf8, #ec4899, #a855f7)',
      }),
      textColor: '#ffffff',
      cardNumberFont: '600',
      border: 'none',
      shadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      hasChip: true,
      chipColor: '#ffffff',
      visaLogoVariant: 'white',
      showBgImage: true,
    },
  ];

  for (const style of cardStyles) {
    await prisma.cardStyle.upsert({
      where: { styleId: style.styleId },
      update: style,
      create: style,
    });
  }

  console.log(`Seeded card styles`);
}

// Helper function to get a random item from an array
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to associate random card styles with money sources
async function associateCardStylesWithMoneySources(prisma: PrismaClient) {
  // Get all card styles and money sources
  const cardStyles = await prisma.cardStyle.findMany();
  const moneySources = await prisma.moneySource.findMany();

  // Associate each money source with a random card style
  for (const moneySource of moneySources) {
    const randomStyle = getRandomItem(cardStyles);

    await prisma.moneySource.update({
      where: { id: moneySource.id },
      data: { cardStyleId: randomStyle.id },
    });
  }

  console.log(
    `Associated random card styles with ${moneySources.length} money sources`,
  );
}

// Seed monthly budgets
async function seedMonthlyBudgets(prisma: PrismaClient) {
  // Get all money sources
  const moneySources = await prisma.moneySource.findMany();

  // Current date information for creating monthly budgets
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Create monthly budgets for current month and next month for each money source
  for (const moneySource of moneySources) {
    // Current month budget (based on the money source's budget property)
    await prisma.monthlyBudget.upsert({
      where: {
        moneySourceId_month_year: {
          moneySourceId: moneySource.id,
          month: currentMonth,
          year: currentYear,
        },
      },
      update: {
        amount: moneySource.budget,
      },
      create: {
        amount: moneySource.budget,
        month: currentMonth,
        year: currentYear,
        moneySourceId: moneySource.id,
        userId: moneySource.userId,
      },
    });

    // Next month budget (slightly adjusted from current month's budget)
    const nextMonth = (currentMonth + 1) % 12;
    const nextMonthYear = nextMonth === 0 ? currentYear + 1 : currentYear;
    const adjustmentFactor = Math.random() * 0.2 - 0.1; // Random adjustment between -10% and +10%
    const nextMonthBudget = Math.round(moneySource.budget * (1 + adjustmentFactor));

    await prisma.monthlyBudget.upsert({
      where: {
        moneySourceId_month_year: {
          moneySourceId: moneySource.id,
          month: nextMonth,
          year: nextMonthYear,
        },
      },
      update: {
        amount: nextMonthBudget,
      },
      create: {
        amount: nextMonthBudget,
        month: nextMonth,
        year: nextMonthYear,
        moneySourceId: moneySource.id,
        userId: moneySource.userId,
      },
    });
  }

  console.log(`Seeded monthly budgets for ${moneySources.length} money sources`);
}

async function main() {
  // Seed card styles first
  await seedCardStyles(prisma);

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

  // Create custom categories for the new users
  const techCategory = await prisma.category.create({
    data: {
      id: `tech-${user3.id}`,
      name: 'Technology',
      icon: '💻',
      isDefault: false,
      userId: user3.id,
    },
  });

  const petsCategory = await prisma.category.create({
    data: {
      id: `pets-${user4.id}`,
      name: 'Pet Expenses',
      icon: '🐾',
      isDefault: false,
      userId: user4.id,
    },
  });

  const luxuryCategory = await prisma.category.create({
    data: {
      id: `luxury-${user5.id}`,
      name: 'Luxury Items',
      icon: '💎',
      isDefault: false,
      userId: user5.id,
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
      budget: 1000,
      userId: user2.id,
    },
  });

  // User 3 money sources
  const user3Cash = await prisma.moneySource.create({
    data: {
      id: `cash-${user3.id}`,
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
      id: `bank-${user3.id}`,
      name: 'Checking Account',
      balance: 5200,
      currency: 'USD',
      icon: '🏦',
      isDefault: true,
      budget: 6000,
      userId: user3.id,
    },
  });

  const user3Savings = await prisma.moneySource.create({
    data: {
      id: `savings-${user3.id}`,
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
      id: `cash-${user4.id}`,
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
      id: `bank-${user4.id}`,
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
      id: `cash-${user5.id}`,
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
      id: `bank-${user5.id}`,
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
      id: `credit-${user5.id}`,
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
      id: `bank-${user6.id}`,
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
      id: `cash-${user7.id}`,
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
      id: `bank-${user7.id}`,
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
      id: `credit-${user7.id}`,
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

  // Create expenses for User 3 (High entertainment and travel spender)
  await prisma.expense.create({
    data: {
      amount: 220.5,
      date: now,
      notes: 'Concert tickets',
      categoryId: 'entertainment',
      moneySourceId: user3Bank.id,
      userId: user3.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 89.99,
      date: now,
      notes: 'Streaming subscriptions',
      categoryId: 'subscriptions',
      moneySourceId: user3Bank.id,
      userId: user3.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 1250,
      date: lastMonth,
      notes: 'Weekend trip',
      categoryId: 'travel',
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
      categoryId: 'entertainment',
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
      categoryId: 'food',
      moneySourceId: user4Cash.id,
      userId: user4.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 800,
      date: lastMonth,
      notes: 'Rent payment',
      categoryId: 'housing',
      moneySourceId: user4Bank.id,
      userId: user4.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 120,
      date: lastMonth,
      notes: 'Utilities bill',
      categoryId: 'utilities',
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
      categoryId: 'shopping',
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
      categoryId: 'subscriptions',
      moneySourceId: user5Bank.id,
      userId: user5.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 49.99,
      date: lastMonth,
      notes: 'Premium app subscriptions',
      categoryId: 'subscriptions',
      moneySourceId: user5Bank.id,
      userId: user5.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 120,
      date: twoMonthsAgo,
      notes: 'Online shopping - various items',
      categoryId: 'shopping',
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
      categoryId: 'education',
      moneySourceId: user6Bank.id,
      userId: user6.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 89,
      date: now,
      notes: 'Gym membership',
      categoryId: 'health',
      moneySourceId: user6Bank.id,
      userId: user6.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 135.5,
      date: lastMonth,
      notes: 'Health supplements',
      categoryId: 'health',
      moneySourceId: user6Bank.id,
      userId: user6.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 75,
      date: twoMonthsAgo,
      notes: 'Reference books',
      categoryId: 'education',
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
      categoryId: 'food',
      moneySourceId: user7CreditCard.id,
      userId: user7.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 120.3,
      date: now,
      notes: 'Specialty groceries',
      categoryId: 'food',
      moneySourceId: user7Bank.id,
      userId: user7.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 85.45,
      date: lastMonth,
      notes: 'Food delivery',
      categoryId: 'food',
      moneySourceId: user7CreditCard.id,
      userId: user7.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 42,
      date: lastMonth,
      notes: 'Coffee and bakery',
      categoryId: 'food',
      moneySourceId: user7Cash.id,
      userId: user7.id,
    },
  });

  await prisma.expense.create({
    data: {
      amount: 37.25,
      date: twoMonthsAgo,
      notes: 'Fast food',
      categoryId: 'food',
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
  
  // Associate random card styles with money sources
  await associateCardStylesWithMoneySources(prisma);
  
  // Seed monthly budgets
  await seedMonthlyBudgets(prisma);

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

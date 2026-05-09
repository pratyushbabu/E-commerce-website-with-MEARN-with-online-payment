const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Ensure SRV records can be resolved
dns.setDefaultResultOrder('ipv4first');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Product = require('./models/Product');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('🌱 Connected to MongoDB. Seeding...');

  // Clear existing data
  await User.deleteMany({});
  await Product.deleteMany({});

  // Create admin
  const admin = await User.create({
    name: 'Admin User', email: 'admin@demo.com',
    password: 'admin123', role: 'admin', isApproved: true,
  });

  // Create sellers
  const seller1 = await User.create({
    name: 'TechWorld Store', email: 'seller@demo.com',
    password: 'seller123', role: 'seller', isApproved: true,
    shopName: 'TechWorld', shopDescription: 'Best electronics at best prices',
  });

  const seller2 = await User.create({
    name: 'FashionHub', email: 'fashion@demo.com',
    password: 'seller123', role: 'seller', isApproved: true,
    shopName: 'FashionHub', shopDescription: 'Trendy fashion for everyone',
  });

  // Create buyer
  await User.create({
    name: 'John Buyer', email: 'buyer@demo.com',
    password: 'buyer123', role: 'buyer', isApproved: true,
    phone: '+91 9876543210',
  });

  // Create products
  const products = [
    { name: 'Wireless Bluetooth Headphones', description: 'Premium sound quality with active noise cancellation. Up to 30 hours battery life.', price: 2999, discountPrice: 1999, quantity: 1, uom: 'pcs', category: 'Electronics', brand: 'SoundPro', stock: 50, seller: seller1._id, isApproved: true, ratings: 4.5, numReviews: 128, soldCount: 340, tags: ['wireless', 'bluetooth', 'headphones', 'audio'], images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', public_id: 'seed1' }] },
    { name: 'Smart Watch Pro', description: 'Feature-packed smartwatch with health monitoring, GPS, and 7-day battery.', price: 8999, discountPrice: 5999, quantity: 1, uom: 'pcs', category: 'Electronics', brand: 'TimeTech', stock: 30, seller: seller1._id, isApproved: true, ratings: 4.3, numReviews: 89, soldCount: 210, tags: ['smartwatch', 'fitness', 'wearable'], images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', public_id: 'seed2' }] },
    { name: 'Mechanical Gaming Keyboard', description: 'RGB backlit mechanical keyboard with tactile switches. Perfect for gaming.', price: 4599, discountPrice: 3299, quantity: 1, uom: 'pcs', category: 'Electronics', brand: 'GameForce', stock: 25, seller: seller1._id, isApproved: true, ratings: 4.7, numReviews: 203, soldCount: 456, tags: ['gaming', 'keyboard', 'mechanical', 'rgb'], images: [{ url: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400', public_id: 'seed3' }] },
    { name: 'Organic Red Apple', description: 'Fresh, organically grown red apples. Crisp and sweet, directly from the farm.', price: 100, discountPrice: 85, quantity: 1, uom: 'kg', category: 'Food', brand: 'FreshFarm', stock: 200, seller: seller2._id, isApproved: true, ratings: 4.6, numReviews: 312, soldCount: 1500, tags: ['organic', 'fresh', 'apple', 'fruit'], images: [{ url: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400', public_id: 'seed4' }] },
    { name: 'Cold Pressed Olive Oil', description: 'Premium extra virgin olive oil, cold-pressed from hand-picked olives.', price: 850, discountPrice: 699, quantity: 1, uom: 'litre', category: 'Food', brand: 'MedTerra', stock: 80, seller: seller2._id, isApproved: true, ratings: 4.8, numReviews: 156, soldCount: 430, tags: ['olive oil', 'organic', 'cooking'], images: [{ url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400', public_id: 'seed5' }] },
    { name: 'Laptop Backpack 35L', description: 'Water-resistant backpack with USB charging port, fits up to 17" laptops.', price: 1999, discountPrice: 1499, quantity: 1, uom: 'pcs', category: 'Electronics', brand: 'TravelPro', stock: 60, seller: seller1._id, isApproved: true, ratings: 4.4, numReviews: 112, soldCount: 567, tags: ['backpack', 'laptop', 'travel', 'bag'], images: [{ url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', public_id: 'seed6' }] },
    { name: 'Yoga Mat Premium', description: 'Non-slip 6mm thick yoga mat with alignment lines. Includes carry strap.', price: 1299, discountPrice: 899, quantity: 1, uom: 'pcs', category: 'Sports', brand: 'ZenFit', stock: 80, seller: seller2._id, isApproved: true, ratings: 4.8, numReviews: 234, soldCount: 780, tags: ['yoga', 'fitness', 'mat', 'exercise'], images: [{ url: 'https://images.unsplash.com/photo-1601925228782-5c3a8e5a4c4c?w=400', public_id: 'seed7' }] },
    { name: 'Stainless Steel Water Bottle', description: 'Insulated bottle keeps drinks cold 24h or hot 12h. BPA-free, leak-proof.', price: 799, discountPrice: 549, quantity: 1, uom: 'pcs', category: 'Sports', brand: 'HydroLife', stock: 120, seller: seller2._id, isApproved: true, ratings: 4.6, numReviews: 189, soldCount: 1200, tags: ['bottle', 'water', 'insulated', 'eco'], images: [{ url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400', public_id: 'seed8' }] },
  ];

  await Product.insertMany(products);

  console.log('✅ Seeded successfully!');
  console.log('\n🔑 Demo Accounts:');
  console.log('   Admin   → admin@demo.com    / admin123');
  console.log('   Seller  → seller@demo.com   / seller123');
  console.log('   Buyer   → buyer@demo.com    / buyer123 \n');
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });

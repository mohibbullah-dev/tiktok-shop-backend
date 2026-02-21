import dotenv from "dotenv";
import connectDB from "../config/db.js";
import Product from "../models/product.model.js";

dotenv.config();
connectDB();

const products = [
  {
    title: "Marcy Pro PM4400 Leverage Home Multi Gym",
    image: "https://via.placeholder.com/300",
    category: "Health Products",
    salesPrice: 665.45,
    costPrice: 532.36,
    profit: 133.09,
    stock: 99999,
    isDistribution: true,
  },
  {
    title: "Apple USB-C 2m Woven Charge Cable",
    image: "https://via.placeholder.com/300",
    category: "Computer accessories",
    salesPrice: 27.61,
    costPrice: 22.09,
    profit: 5.52,
    stock: 99999,
    isDistribution: true,
  },
  {
    title: "Apple 30W USB-C Power Adaptor",
    image: "https://via.placeholder.com/300",
    category: "Computer accessories",
    salesPrice: 37.13,
    costPrice: 29.7,
    profit: 7.43,
    stock: 99999,
    isDistribution: true,
  },
  {
    title: "Apple iPhone 17 Pro Max TechWoven Case",
    image: "https://via.placeholder.com/300",
    category: "Computer accessories",
    salesPrice: 46.65,
    costPrice: 37.32,
    profit: 9.33,
    stock: 99999,
    isDistribution: true,
  },
  {
    title: "Minky Sure Dri 23m 4 Tier Heated Clothes Airer with Cover",
    image: "https://via.placeholder.com/300",
    category: "Home cabinets",
    salesPrice: 133.28,
    costPrice: 106.62,
    profit: 26.66,
    stock: 99999,
    isDistribution: true,
  },
  {
    title: "Dreamland Nap Time Intelliheat Warming Blanket",
    image: "https://via.placeholder.com/300",
    category: "Home cabinets",
    salesPrice: 57.12,
    costPrice: 45.7,
    profit: 11.42,
    stock: 99999,
    isDistribution: true,
  },
];

const seedProducts = async () => {
  try {
    await Product.deleteMany({ isDistribution: true });
    await Product.insertMany(products);
    console.log(`${products.length} products seeded!`);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedProducts();

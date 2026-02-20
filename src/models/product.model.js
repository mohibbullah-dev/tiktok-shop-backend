import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // Which merchant owns/listed this product
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      default: null, // null = platform product in distribution center
    },

    title: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },

    // Pricing
    salesPrice: {
      type: Number,
      required: true, // the price customer pays
    },
    costPrice: {
      type: Number,
      required: true, // the base cost
    },
    profit: {
      type: Number,
      default: 0, // salesPrice - costPrice
    },

    // Stats
    sales: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    predictSales: {
      type: Number,
      default: 0,
    },
    predictClicks: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 99999,
    },

    // Visibility
    isRecommended: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true, // false = "off shelf"
    },

    // Is this in the distribution center (platform product)?
    isDistribution: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const Product = mongoose.model("Product", productSchema);
export default Product;

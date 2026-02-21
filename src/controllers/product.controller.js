import Product from "../models/product.model.js";
import Merchant from "../models/merchant.model.js";

// ─────────────────────────────────────────
// @desc    Get distribution center products
// @route   GET /api/products/distribution
// @access  merchant only
// ─────────────────────────────────────────
export const getDistributionProducts = async (req, res) => {
  const {
    category,
    search,
    sortBy = "createdAt",
    page = 1,
    limit = 20,
  } = req.query;

  const filter = { isDistribution: true, isActive: true };
  if (category) filter.category = category;
  if (search) filter.title = { $regex: search, $options: "i" };

  const total = await Product.countDocuments(filter);

  const products = await Product.find(filter)
    .sort({ [sortBy]: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Get unique categories
  const categories = await Product.distinct("category", {
    isDistribution: true,
    isActive: true,
  });

  res.json({
    products,
    categories,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Merchant adds product to their store
// @route   POST /api/products/distribute/:productId
// @access  merchant only
// ─────────────────────────────────────────
export const distributeProduct = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const sourceProduct = await Product.findById(req.params.productId);
  if (!sourceProduct || !sourceProduct.isDistribution) {
    return res
      .status(404)
      .json({ message: "Product not found in distribution center" });
  }

  // Check if merchant already has this product
  const existing = await Product.findOne({
    merchant: merchant._id,
    title: sourceProduct.title,
  });
  if (existing) {
    return res.status(400).json({ message: "Product already in your store" });
  }

  // Create a copy for merchant's store
  const merchantProduct = await Product.create({
    merchant: merchant._id,
    title: sourceProduct.title,
    image: sourceProduct.image,
    category: sourceProduct.category,
    salesPrice: sourceProduct.salesPrice,
    costPrice: sourceProduct.costPrice,
    profit: sourceProduct.profit,
    stock: sourceProduct.stock,
    isDistribution: false,
    isActive: true,
  });

  res.status(201).json({
    message: "Product added to your store",
    product: merchantProduct,
  });
};

// ─────────────────────────────────────────
// @desc    Distribute multiple products at once
// @route   POST /api/products/distribute-bulk
// @access  merchant only
// ─────────────────────────────────────────
export const distributeBulk = async (req, res) => {
  const { productIds } = req.body;

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  let added = 0;
  let skipped = 0;

  for (const productId of productIds) {
    const source = await Product.findById(productId);
    if (!source) {
      skipped++;
      continue;
    }

    const existing = await Product.findOne({
      merchant: merchant._id,
      title: source.title,
    });
    if (existing) {
      skipped++;
      continue;
    }

    await Product.create({
      merchant: merchant._id,
      title: source.title,
      image: source.image,
      category: source.category,
      salesPrice: source.salesPrice,
      costPrice: source.costPrice,
      profit: source.profit,
      stock: source.stock,
      isDistribution: false,
      isActive: true,
    });
    added++;
  }

  res.json({ message: `${added} products added, ${skipped} skipped` });
};

// ─────────────────────────────────────────
// @desc    Get merchant's own products
// @route   GET /api/products/my-products
// @access  merchant only
// ─────────────────────────────────────────
export const getMyProducts = async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const filter = { merchant: merchant._id };
  if (status === "selling") filter.isActive = true;
  if (status === "inStock") filter.isActive = false;

  const total = await Product.countDocuments(filter);

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    products,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Get single product detail
// @route   GET /api/products/:id
// @access  merchant only
// ─────────────────────────────────────────
export const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json(product);
};

// ─────────────────────────────────────────
// @desc    Toggle product on/off shelf
// @route   PUT /api/products/:id/toggle
// @access  merchant only
// ─────────────────────────────────────────
export const toggleProduct = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });

  const product = await Product.findOne({
    _id: req.params.id,
    merchant: merchant._id,
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  product.isActive = !product.isActive;
  await product.save();

  res.json({
    message: product.isActive
      ? "Product put on shelf"
      : "Product taken off shelf",
    product,
  });
};

// ─────────────────────────────────────────
// @desc    Get all products (admin view)
// @route   GET /api/products/admin
// @access  superAdmin only
// ─────────────────────────────────────────
export const getAllProductsAdmin = async (req, res) => {
  const { merchantId, title, isRecommended, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (title) filter.title = { $regex: title, $options: "i" };
  if (isRecommended !== undefined) {
    filter.isRecommended = isRecommended === "true";
  }

  if (merchantId) {
    const merchant = await Merchant.findOne({ merchantId });
    if (merchant) filter.merchant = merchant._id;
  }

  const total = await Product.countDocuments(filter);

  const products = await Product.find(filter)
    .populate("merchant", "storeName merchantId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    products,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Toggle product recommendation (admin)
// @route   PUT /api/products/:id/recommend
// @access  superAdmin only
// ─────────────────────────────────────────
export const toggleRecommend = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    [{ $set: { isRecommended: { $not: "$isRecommended" } } }],
    { new: true },
  );

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ message: "Recommendation toggled", product });
};

// ─────────────────────────────────────────
// @desc    Get top 10 best selling products
// @route   GET /api/products/top-selling
// @access  merchant only
// ─────────────────────────────────────────
export const getTopSelling = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const products = await Product.find({ merchant: merchant._id })
    .sort({ sales: -1 })
    .limit(10);

  res.json(products);
};

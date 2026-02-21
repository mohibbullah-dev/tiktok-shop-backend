import Order from "../models/order.model.js";
import Merchant from "../models/merchant.model.js";
import Product from "../models/product.model.js";
import Transaction from "../models/transaction.model.js";
import User from "../models/user.model.js";

// Generate order serial number (like 20260203049052133589910 in demo)
const generateOrderSn = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000000000000);
  return `${year}${month}${day}${random}`;
};

// Auto generate fake buyer info
const generateBuyerInfo = () => {
  const names = [
    "Camilla Kharlamova",
    "John Smith",
    "Maria Garcia",
    "Ahmed Hassan",
    "Yuki Tanaka",
    "Emma Wilson",
  ];
  const countries = [
    "Philippines",
    "Austria",
    "Thailand",
    "Singapore",
    "Malaysia",
  ];
  const addresses = [
    "716 Antonio St, Sampaloc, Manila, 1008 Metro Manila",
    "PUDEXING Hauptstrasse 77",
    "901 Thanon Samsen, Bangkok 10300",
    "12 Orchard Road, Singapore",
  ];
  const phones = ["637****263", "430****705", "669****753", "658****421"];

  return {
    buyerName: names[Math.floor(Math.random() * names.length)],
    country: countries[Math.floor(Math.random() * countries.length)],
    shippingAddress: addresses[Math.floor(Math.random() * addresses.length)],
    phoneNumber: phones[Math.floor(Math.random() * phones.length)],
    buyerUserId: Math.floor(10000 + Math.random() * 90000),
  };
};

// Generate fake logistics timeline
const generateLogistics = (orderSn) => {
  const now = new Date();
  return [
    {
      status: "Payment successful, waiting for loading and delivery",
      time: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      status:
        "The express has been shipped out and is being sent to the next station",
      time: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      status:
        "The express has been loaded and is being sent to the transit center",
      time: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      status:
        "The express has arrived at the regional transfer station and is being delivered to the city sorting center",
      time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      status:
        "The express has arrived at the city sorting center and is being sorted",
      time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      status: "The express delivery has been sorted and is being delivered",
      time: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      status: "User has signed",
      time: now,
    },
  ];
};

// ─────────────────────────────────────────
// @desc    Dispatch Admin creates order for merchant
// @route   POST /api/orders/dispatch
// @access  dispatchAdmin only
// ─────────────────────────────────────────
export const dispatchOrder = async (req, res) => {
  const { merchantId, products, completionDays } = req.body;

  // Find merchant
  const merchant = await Merchant.findOne({ merchantId });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  if (merchant.status !== "approved") {
    return res.status(400).json({ message: "Merchant is not approved" });
  }

  // Build products array and calculate totals
  let totalCost = 0;
  let sellingPrice = 0;
  const orderProducts = [];

  for (const item of products) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return res
        .status(404)
        .json({ message: `Product ${item.productId} not found` });
    }

    const itemCost = product.costPrice * item.quantity;
    const itemSelling = product.salesPrice * item.quantity;

    totalCost += itemCost;
    sellingPrice += itemSelling;

    orderProducts.push({
      product: product._id,
      title: product.title,
      image: product.image,
      quantity: item.quantity,
      price: product.salesPrice,
    });
  }

  // Calculate earnings based on merchant VIP rate
  const vipRates = [0.15, 0.2, 0.25, 0.27, 0.33, 0.38, 0.43];
  const rate = vipRates[merchant.vipLevel] || 0.15;
  const earnings = sellingPrice * rate;

  // Auto generate buyer info
  const buyerInfo = generateBuyerInfo();

  // Calculate pickup deadline
  const pickupDeadline = new Date();
  pickupDeadline.setDate(pickupDeadline.getDate() + (completionDays || 1));

  const order = await Order.create({
    orderSn: generateOrderSn(),
    merchant: merchant._id,
    dispatchedBy: req.user._id,
    products: orderProducts,
    ...buyerInfo,
    totalCost,
    sellingPrice,
    earnings,
    completionDays: completionDays || 1,
    pickupDeadline,
    status: "pendingPayment",
  });

  res.status(201).json({
    message: "Order dispatched successfully",
    order,
  });
};

// ─────────────────────────────────────────
// @desc    Dispatch bulk orders to multiple merchants
// @route   POST /api/orders/dispatch-bulk
// @access  dispatchAdmin only
// ─────────────────────────────────────────
export const dispatchBulkOrders = async (req, res) => {
  const { orders } = req.body;
  // orders = array of { merchantId, products, completionDays }

  const results = [];
  const errors = [];

  for (const orderData of orders) {
    try {
      const merchant = await Merchant.findOne({
        merchantId: orderData.merchantId,
      });
      if (!merchant || merchant.status !== "approved") {
        errors.push({
          merchantId: orderData.merchantId,
          error: "Invalid merchant",
        });
        continue;
      }

      let totalCost = 0;
      let sellingPrice = 0;
      const orderProducts = [];

      for (const item of orderData.products) {
        const product = await Product.findById(item.productId);
        if (!product) continue;

        totalCost += product.costPrice * item.quantity;
        sellingPrice += product.salesPrice * item.quantity;

        orderProducts.push({
          product: product._id,
          title: product.title,
          image: product.image,
          quantity: item.quantity,
          price: product.salesPrice,
        });
      }

      const vipRates = [0.15, 0.2, 0.25, 0.27, 0.33, 0.38, 0.43];
      const rate = vipRates[merchant.vipLevel] || 0.15;
      const earnings = sellingPrice * rate;

      const buyerInfo = generateBuyerInfo();
      const pickupDeadline = new Date();
      pickupDeadline.setDate(
        pickupDeadline.getDate() + (orderData.completionDays || 1),
      );

      const order = await Order.create({
        orderSn: generateOrderSn(),
        merchant: merchant._id,
        dispatchedBy: req.user._id,
        products: orderProducts,
        ...buyerInfo,
        totalCost,
        sellingPrice,
        earnings,
        completionDays: orderData.completionDays || 1,
        pickupDeadline,
        status: "pendingPayment",
      });

      results.push(order);
    } catch (err) {
      errors.push({ merchantId: orderData.merchantId, error: err.message });
    }
  }

  res.status(201).json({
    message: `${results.length} orders dispatched`,
    results,
    errors,
  });
};

// ─────────────────────────────────────────
// @desc    Merchant clicks "Pickup" order
// @route   PUT /api/orders/:id/pickup
// @access  merchant only
// ─────────────────────────────────────────
export const pickupOrder = async (req, res) => {
  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // Make sure this order belongs to this merchant
  if (order.merchant.toString() !== merchant._id.toString()) {
    return res.status(403).json({ message: "Not your order" });
  }

  if (order.status !== "pendingPayment") {
    return res.status(400).json({ message: "Order already picked up" });
  }

  // Check merchant has enough balance
  if (merchant.balance < order.totalCost) {
    return res.status(400).json({
      message: "Insufficient balance to pickup this order",
    });
  }

  // Deduct cost from merchant balance
  merchant.balance -= order.totalCost;
  // Add to pending amount (will be released when order completes)
  merchant.pendingAmount += order.sellingPrice;
  await merchant.save();

  // Record debit transaction
  await Transaction.create({
    merchant: merchant._id,
    linkedId: order.orderSn,
    amount: -order.totalCost,
    balanceAfter: merchant.balance,
    type: "orderPayment",
  });

  // Generate logistics info
  const logistics = generateLogistics(order.orderSn);

  // Update order
  order.status = "pendingShipment";
  order.pickedUpAt = new Date();
  order.trackingNumber = order.orderSn;
  order.logisticsInfo = logistics;

  await order.save();

  res.json({
    message: "Order picked up successfully",
    order,
    newBalance: merchant.balance,
  });
};

// ─────────────────────────────────────────
// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  superAdmin, dispatchAdmin, merchantAdmin
// ─────────────────────────────────────────
export const getAllOrders = async (req, res) => {
  const { status, merchantId, orderSn, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (orderSn) filter.orderSn = { $regex: orderSn, $options: "i" };

  // Filter by merchant if provided
  if (merchantId) {
    const merchant = await Merchant.findOne({ merchantId });
    if (merchant) filter.merchant = merchant._id;
  }

  // merchantAdmin only sees their referred merchants orders
  if (req.user.role === "merchantAdmin") {
    const referredMerchants = await Merchant.find({
      referrer: req.user._id,
    }).select("_id");
    filter.merchant = { $in: referredMerchants.map((m) => m._id) };
  }

  const total = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .populate("merchant", "storeName merchantId")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // Calculate totals for summary bar
  const totals = await Order.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalCost: { $sum: "$totalCost" },
        totalEarnings: { $sum: "$earnings" },
      },
    },
  ]);

  res.json({
    orders,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    summary: totals[0] || { totalCost: 0, totalEarnings: 0 },
  });
};

// ─────────────────────────────────────────
// @desc    Get merchant's own orders
// @route   GET /api/orders/my-orders
// @access  merchant only
// ─────────────────────────────────────────
export const getMyOrders = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const merchant = await Merchant.findOne({ user: req.user._id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const filter = { merchant: merchant._id };
  if (status) filter.status = status;

  const total = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({
    orders,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  });
};

// ─────────────────────────────────────────
// @desc    Get single order detail
// @route   GET /api/orders/:id
// @access  merchant, superAdmin, dispatchAdmin
// ─────────────────────────────────────────
export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "merchant",
    "storeName merchantId",
  );

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // If merchant, verify it's their order
  if (req.user.role === "merchant") {
    const merchant = await Merchant.findOne({ user: req.user._id });
    if (order.merchant._id.toString() !== merchant._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
  }

  res.json(order);
};

// ─────────────────────────────────────────
// @desc    Super admin confirms order profit
// @route   PUT /api/orders/:id/confirm-profit
// @access  superAdmin only
// ─────────────────────────────────────────
export const confirmOrderProfit = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.profitConfirmed) {
    return res.status(400).json({ message: "Profit already confirmed" });
  }

  const merchant = await Merchant.findById(order.merchant);
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  // Add earnings to merchant balance
  merchant.balance += order.earnings;
  // Remove from pending amount
  merchant.pendingAmount -= order.sellingPrice;
  if (merchant.pendingAmount < 0) merchant.pendingAmount = 0;
  merchant.totalProfit += order.earnings;
  merchant.totalIncome += order.earnings;
  await merchant.save();

  // Record profit transaction
  await Transaction.create({
    merchant: merchant._id,
    linkedId: order.orderSn,
    amount: order.earnings,
    balanceAfter: merchant.balance,
    type: "orderCompleted",
  });

  // Auto update star rating when profit confirmed on time
  const now = new Date();
  const wasOnTime = order.pickupDeadline && now <= order.pickupDeadline;

  if (wasOnTime) {
    // Add 0.1 star, max 5
    merchant.starRating = Math.min(5, merchant.starRating + 0.1);
    merchant.starRating = Math.round(merchant.starRating * 10) / 10;
  }

  // Also update positive rating rate
  const totalOrders = await Order.countDocuments({
    merchant: merchant._id,
    status: "completed",
  });
  const onTimeOrders = await Order.countDocuments({
    merchant: merchant._id,
    status: "completed",
    profitConfirmed: true,
  });

  if (totalOrders > 0) {
    merchant.positiveRatingRate = Math.round(
      (onTimeOrders / totalOrders) * 100,
    );
  }

  await merchant.save();

  // Update order
  order.status = "completed";
  order.profitConfirmed = true;
  order.profitConfirmedAt = new Date();
  order.completedAt = new Date();
  await order.save();

  res.json({
    message: "Order profit confirmed, balance updated",
    order,
    newBalance: merchant.balance,
  });
};

// ─────────────────────────────────────────
// @desc    Admin cancel order
// @route   PUT /api/orders/:id/cancel
// @access  superAdmin only
// ─────────────────────────────────────────
export const cancelOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (["completed", "cancelled"].includes(order.status)) {
    return res.status(400).json({ message: "Cannot cancel this order" });
  }

  // If merchant already paid, refund them
  if (order.status !== "pendingPayment") {
    const merchant = await Merchant.findById(order.merchant);
    if (merchant) {
      merchant.balance += order.totalCost;
      merchant.pendingAmount -= order.sellingPrice;
      if (merchant.pendingAmount < 0) merchant.pendingAmount = 0;
      await merchant.save();

      await Transaction.create({
        merchant: merchant._id,
        linkedId: order.orderSn,
        amount: order.totalCost,
        balanceAfter: merchant.balance,
        type: "adminAdd",
      });
    }
  }

  // Add BEFORE order.status = 'cancelled'
  const merchant = await Merchant.findById(order.merchant);
  if (merchant) {
    // Deduct 5 points for dispute/refund
    merchant.creditScore = Math.max(0, merchant.creditScore - 5);
    // Deduct 10 points for delayed order
    if (order.pickupDeadline && new Date() > order.pickupDeadline) {
      merchant.creditScore = Math.max(0, merchant.creditScore - 10);
    }
    await merchant.save();
  }

  order.status = "cancelled";
  await order.save();

  res.json({ message: "Order cancelled", order });
};

// ─────────────────────────────────────────
// @desc    One-click ship all pending orders (admin)
// @route   PUT /api/orders/bulk-ship
// @access  superAdmin, dispatchAdmin
// ─────────────────────────────────────────
export const bulkShipOrders = async (req, res) => {
  const { merchantId } = req.body;

  const filter = { status: "pendingShipment" };
  if (merchantId) {
    const merchant = await Merchant.findOne({ merchantId });
    if (merchant) filter.merchant = merchant._id;
  }

  const result = await Order.updateMany(filter, {
    status: "shipped",
  });

  res.json({
    message: `${result.modifiedCount} orders shipped`,
    count: result.modifiedCount,
  });
};

// ─────────────────────────────────────────
// @desc    One-click complete all shipped orders (admin)
// @route   PUT /api/orders/bulk-complete
// @access  superAdmin only
// ─────────────────────────────────────────
export const bulkCompleteOrders = async (req, res) => {
  const orders = await Order.find({ status: "shipped" });

  let completed = 0;
  for (const order of orders) {
    if (!order.profitConfirmed) {
      const merchant = await Merchant.findById(order.merchant);
      if (merchant) {
        merchant.balance += order.earnings;
        merchant.pendingAmount -= order.sellingPrice;
        if (merchant.pendingAmount < 0) merchant.pendingAmount = 0;
        merchant.totalProfit += order.earnings;
        await merchant.save();

        await Transaction.create({
          merchant: merchant._id,
          linkedId: order.orderSn,
          amount: order.earnings,
          balanceAfter: merchant.balance,
          type: "orderCompleted",
        });

        order.status = "completed";
        order.profitConfirmed = true;
        order.profitConfirmedAt = new Date();
        order.completedAt = new Date();
        await order.save();
        completed++;
      }
    }
  }

  res.json({ message: `${completed} orders completed and profits confirmed` });
};

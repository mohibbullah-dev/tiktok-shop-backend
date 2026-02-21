import Question from "../models/question.model.js";

// ─────────────────────────────────────────
// @desc    Get all FAQ questions
// @route   GET /api/questions
// @access  Public
// ─────────────────────────────────────────
export const getQuestions = async (req, res) => {
  const questions = await Question.find({ isActive: true })
    .sort({ sortOrder: 1 })
    .select("title category sortOrder");

  res.json(questions);
};

// ─────────────────────────────────────────
// @desc    Get single question by ID
// @route   GET /api/questions/:id
// @access  Public
// ─────────────────────────────────────────
export const getQuestionById = async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question || !question.isActive) {
    return res.status(404).json({ message: "Question not found" });
  }
  res.json(question);
};

// ─────────────────────────────────────────
// @desc    Create FAQ question
// @route   POST /api/questions
// @access  superAdmin only
// ─────────────────────────────────────────
export const createQuestion = async (req, res) => {
  const { title, content, category, sortOrder } = req.body;

  const question = await Question.create({
    title,
    content,
    category: category || "",
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({ message: "Question created", question });
};

// ─────────────────────────────────────────
// @desc    Update FAQ question
// @route   PUT /api/questions/:id
// @access  superAdmin only
// ─────────────────────────────────────────
export const updateQuestion = async (req, res) => {
  const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!question) {
    return res.status(404).json({ message: "Question not found" });
  }
  res.json({ message: "Question updated", question });
};

// ─────────────────────────────────────────
// @desc    Delete FAQ question
// @route   DELETE /api/questions/:id
// @access  superAdmin only
// ─────────────────────────────────────────
export const deleteQuestion = async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ message: "Question deleted" });
};

// ─────────────────────────────────────────
// @desc    Get cooperation contract
// @route   GET /api/questions/contract
// @access  merchant only
// ─────────────────────────────────────────
export const getContract = async (req, res) => {
  res.json({
    title: "TikTok Shop Cooperation Agreement",
    content: `TIKTOK SHOP COOPERATION AGREEMENT

This agreement is between TikTok Shop Platform and the Store Owner.

1. PLATFORM SERVICES
TikTok Shop provides order management, product distribution, and payment processing services.

2. STORE OBLIGATIONS
- Process orders within stipulated timeframes
- Maintain minimum credit score of 80
- Comply with platform advertising regulations

3. PROFIT SHARING
- Profit rates based on VIP level (15% to 43%)
- Profits confirmed by platform administrator
- Withdrawals processed within 3 business days

4. ACCOUNT MANAGEMENT
- Store owners must maintain sufficient working capital
- Daily sign-in rewards of $15 available
- VIP upgrades available based on working capital

5. TERMINATION
Either party may terminate with 30 days notice after all orders are completed and funds withdrawn.

This document reflects the exact workflow demonstrated in the reference interface.`,
    version: "1.0",
    updatedAt: new Date(),
  });
};

// ─────────────────────────────────────────
// @desc    Seed default FAQ questions
// @route   POST /api/questions/seed
// @access  superAdmin only
// ─────────────────────────────────────────
export const seedQuestions = async (req, res) => {
  const defaultQuestions = [
    {
      title: "Account Status",
      category: "account",
      sortOrder: 1,
      content: `1. How to Evaluate and Rank Stores\nStore evaluations and rankings are standards for assessing whether a store is operating normally.\n\n2. How to Calculate Store Evaluations and Rankings\nStar Rating: 0.1 star will be added if the order is completed within the stipulated time.\nReliability: The initial value is 100 points, with a deduction of 5 points for each disputed order.\n\n3. Can buyers see my reliability and star rating?\nBuyers can view the store ranking and star rating on the store homepage.`,
    },
    {
      title: "Product List Management",
      category: "products",
      sortOrder: 2,
      content: `1. How to add products to your store?\nGo to Distribution Center and click the Distribution button on any product.\n\n2. How to remove products?\nGo to Product Management and click Off Shelf button.`,
    },
    {
      title: "Advertising Regulations",
      category: "advertising",
      sortOrder: 3,
      content: `1. How to promote my product\nWithin 7 days of creating your store, TikTok will provide free traffic support to increase your product visibility.\n\n2. How to cancel promotion\nBased on TikTok push mechanism, the promotional package cannot be canceled after purchase.`,
    },
    {
      title: "Transportation Rules",
      category: "transport",
      sortOrder: 4,
      content: `1. How to arrange delivery?\nTikTok Delivery mode, operations center arranges warehouse delivery.\n\n2. How long is the delivery period?\n24 hours after principal payment.\n\n3. How long will customers receive their goods?\n2-7 days depending on region.`,
    },
    {
      title: "Capital Safety Management",
      category: "finance",
      sortOrder: 5,
      content: `1. How to deposit money?\nClick the deposit button and follow instructions.\n\n2. How to withdraw money?\nLink withdrawal channel, set payment password, ensure sufficient balance.\n\n3. How long does it take to process withdrawals?\n3 minutes processing time, may vary.`,
    },
    {
      title: "Complaints and Disputes",
      category: "complaints",
      sortOrder: 6,
      content: `1. Why is my shipping logistics status not updated?\n2-12 hour delay is normal.\n\n2. What if my shipment is lost during transit?\nTikTok bears losses.\n\n3. Returns and refunds\nShipping costs deducted, profit deducted, principal refunded.`,
    },
    {
      title: "Store Management",
      category: "store",
      sortOrder: 7,
      content: `1. How to change store name, avatar?\nContact customer service, once per month limit.\n\n2. How to close the store?\nComplete all orders, withdraw all funds, 30-day waiting period.`,
    },
  ];

  await Question.deleteMany({});
  await Question.insertMany(defaultQuestions);

  res.json({ message: "7 FAQ questions seeded" });
};

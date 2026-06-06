const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  getRazorpayConfigHandler,
  createRazorpayOrderHandler,
  verifyRazorpayPaymentHandler,
  getDodoConfigHandler,
  createDodoCheckoutHandler,
  completeDodoPaymentHandler,
} = require("../controllers/billingController");

const router = express.Router();

router.get("/razorpay/config", authenticate, getRazorpayConfigHandler);
router.post("/razorpay/order", authenticate, createRazorpayOrderHandler);
router.post("/razorpay/verify", authenticate, verifyRazorpayPaymentHandler);

router.get("/dodo/config", authenticate, getDodoConfigHandler);
router.post("/dodo/checkout", authenticate, createDodoCheckoutHandler);
router.post("/dodo/complete", authenticate, completeDodoPaymentHandler);

module.exports = router;

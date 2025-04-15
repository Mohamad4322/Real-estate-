const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendToQueue } = require("../helpers/rabbitmq");
require("dotenv").config();

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const message = {
      action: "register",
      name,
      email,
      password: hashedPassword,
      correlationId: crypto.randomUUID(),
    };

    const response = await sendToQueue(message);

    res.status(response.status || 202).json(response);
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const message = {
      action: "login",
      email,
      password,
      correlationId: crypto.randomUUID(),
    };

    const response = await sendToQueue(message);

    res.status(response.status || 202).json(response);
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const resetToken = crypto.randomBytes(32).toString("hex");

    const message = {
      action: "forgot-password",
      email,
      resetToken,
      correlationId: crypto.randomUUID(),
    };

    const response = await sendToQueue(message);

    res.status(response.status || 202).json(response);
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

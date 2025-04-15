const express = require("express");
const router = express.Router();

router.post("/estimate", (req, res) => {
    const { purchasePrice, monthlyRent, expenses } = req.body;

    if (!purchasePrice || !monthlyRent || !expenses) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Example calculation
    const estimatedValue = purchasePrice * 1.05;  // Simulating price appreciation (5%)
    const roi = ((monthlyRent * 12 - expenses) / purchasePrice) * 100;
    const breakEvenYears = purchasePrice / (monthlyRent * 12);

    res.json({ estimatedValue, roi: `${roi.toFixed(2)}%`, breakEvenYears });
});

module.exports = router;

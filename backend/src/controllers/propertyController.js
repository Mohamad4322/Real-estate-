const axios = require("axios");


exports.getPropertyEstimate = async (req, res) => {
  try {
    
    const { address } = req.query;

    // Example: Using RentCast API
    const response = await axios.get("https://api.rentcast.io/v1/properties/random?limit=5", {
      headers: {
        "X-Api-Key": process.env.API_KEY,
      },
    });

    
    res.json(response.data);
  } catch (error) {
    console.error("Property estimate error:", error.message);
    res.status(500).json({ error: "Failed to fetch property data" });
  }
};


exports.calculateRentalProfit = (req, res) => {
  try {
    
    const { purchasePrice, monthlyRent, expenses } = req.body;
    const annualRent = monthlyRent * 12;
    const annualProfit = annualRent - expenses;
    const roi = (annualProfit / purchasePrice) * 100;

    res.json({
      purchasePrice,
      monthlyRent,
      expenses,
      annualProfit,
      roi: `${roi.toFixed(2)}%`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



const mongoose = require("mongoose");

const planSchema = new mongoose.Schema({
    price: Number,
    title: String,
    description: String,
    duration: Number,
    advantages: [
      {
        title: String,
        description: String
      }
    ]
});

const Plan = mongoose.model("plan", planSchema);

module.exports = Plan;
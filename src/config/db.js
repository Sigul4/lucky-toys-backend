require('dotenv').config()
const mongoose = require("mongoose");

async function connectMongoose() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("Connect to mongoDB!");
  } catch (e) {
    console.log("Connection to MongoDB error:", e.message);
  }
}

connectMongoose();

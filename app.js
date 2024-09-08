require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const emailRoutes = require("./src/routes/emailRoutes");
const paymentRoutes = require("./src/routes/paymentRoutes");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

app.use("/api/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Welcome to server");
});

app.use("/api", emailRoutes);
app.use("/api", paymentRoutes);

app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

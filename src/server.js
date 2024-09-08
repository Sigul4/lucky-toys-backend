require("./config/db");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const paymentRoutes = require("./domains/payments");
const routes = require("./routes");

const origin = process.env.BASE_URL;

const app = express();


app.use("/payments/webhook", express.raw({ type: "application/json" }));

app.use(cors({ credentials: true, origin: origin }));
app.use(cookieParser());
app.use(express.json());


app.use("/payments", paymentRoutes);
app.use(routes);

module.exports = app;

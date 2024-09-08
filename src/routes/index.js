const express = require("express");
const router = express.Router();

const userRoutes = require("../domains/user");
const nodemailerRoutes = require("../domains/nodemailer");

router.use("/user", userRoutes);
router.use("/nodemailer", nodemailerRoutes);

module.exports = router;

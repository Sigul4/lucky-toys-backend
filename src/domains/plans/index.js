const express = require("express");
const routes = express.Router();

const {
    showAllPlans,
    createPlan
  } = require("./controllers");

  routes.get("/showAllPlans", showAllPlans);
  routes.post("/createPlan", createPlan);

  module.exports = routes;
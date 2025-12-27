const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const dashboardController = require("../controllers/dashboardController");

router.get("/api/v1/dashboard-basic", auth, dashboardController.getDashboardBasic);

router.get("/api/v1/dashboard-advanced", auth, dashboardController.getDashboardAdvanced);

module.exports = router;
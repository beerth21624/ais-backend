const express = require("express");
const getResponse = require("../controllers/recommendController");

const router = express.Router();

router.use("/recommend", getResponse);

module.exports = router;

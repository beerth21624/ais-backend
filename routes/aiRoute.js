const express = require('express');
const AiController = require('../controllers/aiController');

const router = express.Router();

router.use('/message', AiController.processMessage);

module.exports = router;
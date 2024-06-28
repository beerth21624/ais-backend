const router = require('express').Router();
const { createUserController, loginController } = require('../controllers/userController');


router.post('/register', createUserController);
router.post('/login', loginController);

module.exports = router;




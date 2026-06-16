const express = require('express');
const router = express.Router();
const { register, login, logout, me, updateBudget } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, me);
router.put('/budget', authenticateToken, updateBudget);

module.exports = router;

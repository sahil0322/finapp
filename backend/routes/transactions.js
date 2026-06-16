const express = require('express');
const router = express.Router();
const { getAll, getSummary, create, update, remove, exportCSV } = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/summary', getSummary);
router.get('/export', exportCSV);
router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;

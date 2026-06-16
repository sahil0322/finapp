const db = require('../database');

const VALID_CATEGORIES = ['Food','Travel','Shopping','Salary','Education','Bills','Other'];
const VALID_TYPES      = ['income', 'expense'];

const getAll = (req, res) => {
  const { type, category, search, month } = req.query;
  const txs = db.getTransactions(req.user.id, { type, category, search, month });
  res.json(txs);
};

const getSummary = (req, res) => {
  res.json(db.getSummary(req.user.id));
};

const create = (req, res) => {
  const { type, amount, category, date, description } = req.body;
  if (!type || !amount || !category || !date)
    return res.status(400).json({ error: 'Type, amount, category, and date are required' });
  if (!VALID_TYPES.includes(type))       return res.status(400).json({ error: 'Invalid type' });
  if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  if (isNaN(amount) || Number(amount) <= 0) return res.status(400).json({ error: 'Amount must be positive' });

  const tx = db.createTransaction(req.user.id, type, amount, category, date, description);
  res.status(201).json(tx);
};

const update = (req, res) => {
  const id = Number(req.params.id);
  const existing = db.findTransactionById(id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  const { type, amount, category, date, description } = req.body;
  if (type && !VALID_TYPES.includes(type))           return res.status(400).json({ error: 'Invalid type' });
  if (category && !VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  if (amount && (isNaN(amount) || Number(amount) <= 0)) return res.status(400).json({ error: 'Amount must be positive' });

  const fields = {};
  if (type)        fields.type     = type;
  if (amount)      fields.amount   = Number(amount);
  if (category)    fields.category = category;
  if (date)        fields.date     = date;
  if (description !== undefined) fields.description = description;

  const updated = db.updateTransaction(id, req.user.id, fields);
  res.json(updated);
};

const remove = (req, res) => {
  const id = Number(req.params.id);
  if (!db.findTransactionById(id, req.user.id))
    return res.status(404).json({ error: 'Transaction not found' });
  db.deleteTransaction(id, req.user.id);
  res.json({ message: 'Deleted' });
};

const exportCSV = (req, res) => {
  const txs = db.getTransactions(req.user.id, {});
  const headers = 'ID,Type,Amount,Category,Date,Description,Created At\n';
  const csv = txs.map(r =>
    `${r.id},${r.type},${r.amount},${r.category},${r.date},"${(r.description||'').replace(/"/g,'""')}",${r.created_at}`
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
  res.send(headers + csv);
};

module.exports = { getAll, getSummary, create, update, remove, exportCSV };

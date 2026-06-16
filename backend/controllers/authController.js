const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const register = (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  if (db.findUserByEmail(email))
    return res.status(409).json({ error: 'Email already registered' });

  const hashed = bcrypt.hashSync(password, 10);
  const user   = db.createUser(name, email, hashed);

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ message: 'Registered', user: { id: user.id, name: user.name, email: user.email } });
};

const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const user = db.findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email } });
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};

const me = (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safe } = user;
  res.json(safe);
};

const updateBudget = (req, res) => {
  const { budget_limit } = req.body;
  if (budget_limit === undefined || budget_limit < 0)
    return res.status(400).json({ error: 'Invalid budget limit' });
  db.updateUserBudget(req.user.id, Number(budget_limit));
  res.json({ message: 'Budget updated', budget_limit });
};

module.exports = { register, login, logout, me, updateBudget };

const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'banking.json');

const DEFAULT = { users: [], transactions: [], _nextUserId: 1, _nextTxId: 1 };

function read() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT, null, 2));
    return JSON.parse(JSON.stringify(DEFAULT));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const db = {
  // Users
  findUserByEmail: (email) => {
    const d = read();
    return d.users.find(u => u.email === email) || null;
  },
  findUserById: (id) => {
    const d = read();
    return d.users.find(u => u.id === id) || null;
  },
  createUser: (name, email, password) => {
    const d = read();
    if (d.users.find(u => u.email === email)) return null;
    const user = { id: d._nextUserId++, name, email, password, budget_limit: 0, created_at: new Date().toISOString() };
    d.users.push(user);
    write(d);
    return user;
  },
  updateUserBudget: (id, budget_limit) => {
    const d = read();
    const u = d.users.find(u => u.id === id);
    if (!u) return null;
    u.budget_limit = budget_limit;
    write(d);
    return u;
  },

  // Transactions
  createTransaction: (user_id, type, amount, category, date, description) => {
    const d = read();
    const tx = {
      id: d._nextTxId++, user_id, type, amount: Number(amount), category,
      date, description: description || '', created_at: new Date().toISOString()
    };
    d.transactions.push(tx);
    write(d);
    return tx;
  },
  getTransactions: (user_id, filters = {}) => {
    const d = read();
    let txs = d.transactions.filter(t => t.user_id === user_id);
    if (filters.type)     txs = txs.filter(t => t.type === filters.type);
    if (filters.category) txs = txs.filter(t => t.category === filters.category);
    if (filters.search)   {
      const s = filters.search.toLowerCase();
      txs = txs.filter(t => t.description.toLowerCase().includes(s) || t.category.toLowerCase().includes(s));
    }
    if (filters.month)    txs = txs.filter(t => t.date.startsWith(filters.month));
    return txs.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  },
  findTransactionById: (id, user_id) => {
    const d = read();
    return d.transactions.find(t => t.id === id && t.user_id === user_id) || null;
  },
  updateTransaction: (id, user_id, fields) => {
    const d = read();
    const tx = d.transactions.find(t => t.id === id && t.user_id === user_id);
    if (!tx) return null;
    Object.assign(tx, fields);
    write(d);
    return tx;
  },
  deleteTransaction: (id, user_id) => {
    const d = read();
    const idx = d.transactions.findIndex(t => t.id === id && t.user_id === user_id);
    if (idx === -1) return false;
    d.transactions.splice(idx, 1);
    write(d);
    return true;
  },
  getSummary: (user_id) => {
    const d = read();
    const txs = d.transactions.filter(t => t.user_id === user_id);
    const total_income   = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const total_expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // By category
    const catMap = {};
    txs.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const by_category = Object.entries(catMap).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);

    // Monthly
    const monthMap = {};
    txs.forEach(t => {
      const m = t.date.slice(0, 7);
      if (!monthMap[m]) monthMap[m] = { month: m, income: 0, expense: 0 };
      monthMap[m][t.type] = (monthMap[m][t.type] || 0) + t.amount;
    });
    const monthly = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    const recent = txs.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)).slice(0, 10);
    const user   = d.users.find(u => u.id === user_id);

    return { total_income, total_expenses, balance: total_income - total_expenses,
             budget_limit: user?.budget_limit || 0, by_category, monthly, recent };
  }
};

console.log('✅ JSON Database ready at', DB_PATH);
module.exports = db;

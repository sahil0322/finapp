// ─── State ───────────────────────────────────────────────────────────────────
let currentUser = null;
let pieChart = null;
let barChart = null;
let currentTxType = 'income';
let editTxType = 'income';

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Set today's date on add form
  document.getElementById('tx-date').value = today();

  // Dark mode from localStorage
  if (localStorage.getItem('darkMode') === 'true') {
    document.documentElement.classList.add('dark');
    updateDarkToggle(true);
  }

  await checkAuth();
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      currentUser = await res.json();
      showApp();
    } else {
      showAuth();
    }
  } catch {
    showAuth();
  }
}

async function handleLogin() {
  const email = val('login-email');
  const password = val('login-password');
  hideEl('login-error');
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) { showError('login-error', data.error); return; }
    currentUser = data.user;
    showApp();
  } catch {
    showError('login-error', 'Connection failed. Is the server running?');
  }
}

async function handleRegister() {
  const name = val('reg-name'), email = val('reg-email');
  const password = val('reg-password'), confirm = val('reg-confirm');
  hideEl('register-error');
  if (password !== confirm) { showError('register-error', 'Passwords do not match'); return; }
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) { showError('register-error', data.error); return; }
    currentUser = data.user;
    showApp();
  } catch {
    showError('register-error', 'Connection failed. Is the server running?');
  }
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  showAuth();
}

function showAuth() {
  hideEl('app-container'); showEl('auth-container');
  showLogin();
}

function showApp() {
  hideEl('auth-container'); showEl('app-container');
  document.getElementById('sidebar-user-name').textContent = currentUser.name;
  document.getElementById('sidebar-user-email').textContent = currentUser.email;
  navigate('dashboard');
}

function showLogin()    { showEl('login-form');    hideEl('register-form'); }
function showRegister() { showEl('register-form'); hideEl('login-form');    }

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.remove('active', 'text-yellow-400');
    l.style.color = '';
  });

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  document.querySelectorAll(`.nav-link[data-page="${page}"], .nav-link[data-page="${page}-mob"]`).forEach(l => {
    l.classList.add('active');
  });

  if (page === 'dashboard') loadDashboard();
  if (page === 'transactions') loadTransactions();
  if (page === 'budget') loadBudget();
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const res = await fetch('/api/transactions/summary');
    const data = await res.json();

    document.getElementById('dash-income').textContent   = fmt(data.total_income);
    document.getElementById('dash-expenses').textContent = fmt(data.total_expenses);
    document.getElementById('dash-balance').textContent  = fmt(data.balance);

    // Budget alert
    const alert = document.getElementById('budget-alert');
    const msg   = document.getElementById('budget-alert-msg');
    if (data.budget_limit > 0 && data.total_expenses > data.budget_limit) {
      const over = data.total_expenses - data.budget_limit;
      msg.textContent = `You've exceeded your budget by ${fmt(over)}. Limit: ${fmt(data.budget_limit)}`;
      showEl('budget-alert');
    } else {
      hideEl('budget-alert');
    }

    // Recent transactions
    const list = document.getElementById('recent-list');
    if (!data.recent.length) {
      list.innerHTML = '<div class="p-6 text-center text-slate-400 text-sm">No transactions yet. <button onclick="navigate(\'add\')" class="text-emerald-500 underline">Add one!</button></div>';
    } else {
      list.innerHTML = data.recent.map(txRow).join('');
    }

    // Charts
    renderPieChart(data.by_category);
    renderBarChart(data.monthly);
  } catch (e) {
    console.error(e);
  }
}

function renderPieChart(categories) {
  const canvas = document.getElementById('pieChart');
  const emptyEl = document.getElementById('pie-empty');
  if (!categories.length) {
    canvas.style.display = 'none'; showEl('pie-empty'); return;
  }
  canvas.style.display = ''; hideEl('pie-empty');
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: categories.map(c => c.category),
      datasets: [{ data: categories.map(c => c.total), backgroundColor: CHART_COLORS, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: getChartTextColor(), font: { family: 'DM Sans', size: 12 }, boxWidth: 12, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed)}` } }
      }
    }
  });
}

function renderBarChart(monthly) {
  const canvas = document.getElementById('barChart');
  const emptyEl = document.getElementById('bar-empty');
  if (!monthly.length) {
    canvas.style.display = 'none'; showEl('bar-empty'); return;
  }
  canvas.style.display = ''; hideEl('bar-empty');
  const sorted = [...monthly].reverse().slice(-6);
  if (barChart) barChart.destroy();
  barChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(m => m.month),
      datasets: [
        { label: 'Income',  data: sorted.map(m => m.income),  backgroundColor: '#059669', borderRadius: 6, borderSkipped: false },
        { label: 'Expense', data: sorted.map(m => m.expense), backgroundColor: '#e11d48', borderRadius: 6, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: getChartTextColor(), font: { family: 'DM Sans', size: 12 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.parsed.y)}` } }
      },
      scales: {
        x: { ticks: { color: getChartTextColor(), font: { size: 11 } }, grid: { display: false } },
        y: { ticks: { color: getChartTextColor(), font: { size: 11 }, callback: v => '₹'+v.toLocaleString('en-IN') }, grid: { color: 'rgba(100,116,139,0.15)' } }
      }
    }
  });
}

const CHART_COLORS = ['#10b981','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316'];
function getChartTextColor() { return document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'; }

// ─── Transactions ─────────────────────────────────────────────────────────────
async function loadTransactions() {
  const search   = val('search-input');
  const type     = document.getElementById('filter-type')?.value;
  const category = document.getElementById('filter-category')?.value;
  const params   = new URLSearchParams();
  if (search) params.set('search', search);
  if (type)   params.set('type', type);
  if (category) params.set('category', category);

  const res = await fetch('/api/transactions?' + params);
  const txs = await res.json();
  const body = document.getElementById('tx-table-body');

  if (!txs.length) {
    body.innerHTML = '<tr><td colspan="6" class="px-5 py-10 text-center text-slate-400">No transactions found</td></tr>';
    return;
  }
  body.innerHTML = txs.map(tx => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
      <td class="px-5 py-3.5 text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap">${formatDate(tx.date)}</td>
      <td class="px-5 py-3.5">
        <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${tx.type==='income' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}">
          ${tx.type==='income' ? '↑' : '↓'} ${capitalize(tx.type)}
        </span>
      </td>
      <td class="px-5 py-3.5 text-slate-600 dark:text-slate-300 text-sm">${tx.category}</td>
      <td class="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-sm max-w-xs truncate">${tx.description || '—'}</td>
      <td class="px-5 py-3.5 font-mono font-semibold text-right text-sm whitespace-nowrap ${tx.type==='income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
        ${tx.type==='income' ? '+' : '-'}${fmt(tx.amount)}
      </td>
      <td class="px-5 py-3.5 text-right whitespace-nowrap">
        <button onclick="openEdit(${tx.id})" class="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition p-1" title="Edit">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </button>
        <button onclick="deleteTx(${tx.id})" class="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition p-1 ml-1" title="Delete">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

function clearFilters() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-category').value = '';
  loadTransactions();
}

async function exportCSV() {
  const a = document.createElement('a');
  a.href = '/api/transactions/export';
  a.download = 'transactions.csv';
  a.click();
  toast('CSV downloaded!', 'success');
}

// ─── Add Transaction ──────────────────────────────────────────────────────────
function setType(type) {
  currentTxType = type;
  document.getElementById('tx-type').value = type;
  if (type === 'income') {
    document.getElementById('type-income').className = 'py-2.5 rounded-lg text-sm font-medium transition-all bg-emerald-600 text-white';
    document.getElementById('type-expense').className = 'py-2.5 rounded-lg text-sm font-medium transition-all text-slate-500 dark:text-slate-400';
  } else {
    document.getElementById('type-expense').className = 'py-2.5 rounded-lg text-sm font-medium transition-all bg-rose-600 text-white';
    document.getElementById('type-income').className = 'py-2.5 rounded-lg text-sm font-medium transition-all text-slate-500 dark:text-slate-400';
  }
}

async function submitTransaction() {
  const type        = document.getElementById('tx-type').value;
  const amount      = val('tx-amount');
  const category    = val('tx-category');
  const date        = val('tx-date');
  const description = val('tx-desc');
  hideEl('add-error');

  if (!amount || !category || !date) {
    showError('add-error', 'Amount, category, and date are required');
    return;
  }

  const res = await fetch('/api/transactions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, amount: parseFloat(amount), category, date, description })
  });
  const data = await res.json();
  if (!res.ok) { showError('add-error', data.error); return; }

  toast('Transaction added!', 'success');
  // Reset form
  document.getElementById('tx-amount').value = '';
  document.getElementById('tx-desc').value = '';
  document.getElementById('tx-category').value = '';
  document.getElementById('tx-date').value = today();
  setType('income');
  navigate('dashboard');
}

// ─── Edit / Delete ────────────────────────────────────────────────────────────
async function openEdit(id) {
  const res = await fetch('/api/transactions?search=');
  const all = await res.json();
  const tx  = all.find(t => t.id === id);
  if (!tx) return;

  document.getElementById('edit-id').value       = tx.id;
  document.getElementById('edit-amount').value   = tx.amount;
  document.getElementById('edit-date').value     = tx.date;
  document.getElementById('edit-category').value = tx.category;
  document.getElementById('edit-desc').value     = tx.description || '';
  setEditType(tx.type);
  showEl('edit-modal');
}

function setEditType(type) {
  editTxType = type;
  document.getElementById('edit-type').value = type;
  if (type === 'income') {
    document.getElementById('edit-type-income').className = 'py-2 rounded-lg text-sm font-medium transition-all bg-emerald-600 text-white';
    document.getElementById('edit-type-expense').className = 'py-2 rounded-lg text-sm font-medium transition-all text-slate-500 dark:text-slate-400';
  } else {
    document.getElementById('edit-type-expense').className = 'py-2 rounded-lg text-sm font-medium transition-all bg-rose-600 text-white';
    document.getElementById('edit-type-income').className = 'py-2 rounded-lg text-sm font-medium transition-all text-slate-500 dark:text-slate-400';
  }
}

async function saveEdit() {
  const id = document.getElementById('edit-id').value;
  const body = {
    type:        document.getElementById('edit-type').value,
    amount:      parseFloat(document.getElementById('edit-amount').value),
    category:    document.getElementById('edit-category').value,
    date:        document.getElementById('edit-date').value,
    description: document.getElementById('edit-desc').value
  };
  const res = await fetch(`/api/transactions/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res.ok) {
    closeModal();
    toast('Transaction updated!', 'success');
    loadTransactions();
  } else {
    const d = await res.json();
    toast(d.error || 'Update failed', 'error');
  }
}

async function deleteTx(id) {
  if (!confirm('Delete this transaction?')) return;
  const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
  if (res.ok) {
    toast('Transaction deleted', 'success');
    loadTransactions();
  }
}

function closeModal() { hideEl('edit-modal'); }

// ─── Budget ───────────────────────────────────────────────────────────────────
async function loadBudget() {
  const [userRes, sumRes] = await Promise.all([
    fetch('/api/auth/me'),
    fetch('/api/transactions/summary')
  ]);
  const user = await userRes.json();
  const sum  = await sumRes.json();

  document.getElementById('budget-input').value = user.budget_limit || '';

  const limit  = user.budget_limit || 0;
  const spent  = sum.total_expenses || 0;
  const remain = Math.max(0, limit - spent);
  const pct    = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

  document.getElementById('bs-limit').textContent     = fmt(limit);
  document.getElementById('bs-spent').textContent     = fmt(spent);
  document.getElementById('bs-remaining').textContent = fmt(remain);
  document.getElementById('bs-pct').textContent       = `${pct.toFixed(1)}% used`;

  const bar = document.getElementById('bs-bar');
  bar.style.width = pct + '%';
  bar.className = `h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`;
}

async function saveBudget() {
  const budget_limit = parseFloat(document.getElementById('budget-input').value) || 0;
  const res = await fetch('/api/auth/budget', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ budget_limit })
  });
  if (res.ok) {
    toast('Budget saved!', 'success');
    loadBudget();
    loadDashboard();
  }
}

// ─── Dark Mode ────────────────────────────────────────────────────────────────
function toggleDark() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
  updateDarkToggle(isDark);
  // Re-render charts with new text colors
  setTimeout(() => { loadDashboard(); }, 100);
}

function updateDarkToggle(isDark) {
  const thumb = document.getElementById('dark-thumb');
  if (thumb) thumb.style.transform = isDark ? 'translateX(20px)' : 'translateX(0)';
  const toggle = document.getElementById('dark-toggle');
  if (toggle) toggle.className = `relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isDark ? 'bg-emerald-500' : 'bg-slate-700'}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function txRow(tx) {
  return `
    <div class="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type==='income' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}">
          <span class="text-sm ${tx.type==='income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${tx.type==='income' ? '↑' : '↓'}</span>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">${tx.category}</p>
          <p class="text-xs text-slate-400 truncate">${tx.description || formatDate(tx.date)}</p>
        </div>
      </div>
      <span class="font-mono text-sm font-semibold flex-shrink-0 ml-3 ${tx.type==='income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
        ${tx.type==='income' ? '+' : '-'}${fmt(tx.amount)}
      </span>
    </div>`;
}

function fmt(n) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function val(id) { return (document.getElementById(id)?.value || '').trim(); }

function showEl(id)   { document.getElementById(id)?.classList.remove('hidden'); }
function hideEl(id)   { document.getElementById(id)?.classList.add('hidden'); }

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

let toastTimer;
function toast(msg, type = 'success') {
  const el    = document.getElementById('toast');
  const inner = document.getElementById('toast-inner');
  const colors = { success: 'bg-emerald-600 text-white', error: 'bg-rose-600 text-white', info: 'bg-blue-600 text-white' };
  inner.className = `px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 ${colors[type]}`;
  inner.innerHTML = (type === 'success' ? '✓ ' : type === 'error' ? '✕ ' : 'ℹ ') + msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// Close modal on background click
document.getElementById('edit-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});

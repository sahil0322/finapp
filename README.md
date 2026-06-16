# FinVault – Financial Management Banking App

A full-stack personal finance management web application built with Node.js, Express, SQLite, and Tailwind CSS. Track income, expenses, set budgets, visualize spending, and manage your financial health — all in one clean, responsive dashboard.

---

## Features

### Core
-  **Secure Authentication** – Register/Login with bcrypt-hashed passwords and JWT (httpOnly cookies)
-  **Dashboard** – At-a-glance totals for Income, Expenses, and Balance
-  **Add Transactions** – Type (Income/Expense), Amount, Category, Date, Description
-  **Transaction History** – Full paginated table of all past transactions

### Bonus (All Implemented)
-  **Edit & Delete** – Inline management of any transaction
-  **Advanced Filters** – Filter by Type, Category, and real-time text search
-  **CSV Export** – Download your full transaction history as a `.csv` file
-  **Charts** – Pie chart (expenses by category) + Bar chart (monthly income vs expenses) via Chart.js
-  **Budget Limits** – Set a monthly budget; get a visual warning when exceeded
-  **Dark Mode** – Full dark/light toggle persisted in localStorage
-  **Responsive** – Works perfectly on mobile, tablet, and desktop

---

## 🛠 Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | HTML, Vanilla JS, Tailwind CSS (CDN) |
| Backend   | Node.js + Express.js              |
| Database  | JSON flat-file via Node.js `fs`       |
| Auth      | JWT + bcryptjs                    |
| Charts    | Chart.js (CDN)                    |
| Fonts     | DM Serif Display + DM Sans (Google Fonts) |

---

##  Folder Structure

```
finapp/
├── backend/
│   ├── controllers/
│   │   ├── authController.js        # Register, Login, Logout, Budget
│   │   └── transactionController.js # CRUD + Summary + CSV Export
│   ├── middleware/
│   │   └── auth.js                  # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js                  # /api/auth/* routes
│   │   └── transactions.js          # /api/transactions/* routes
│   ├── database.js                  # SQLite init + schema
│   └── server.js                    # Express app entry point
├── public/
│   ├── js/
│   │   └── app.js                   # SPA router + all frontend logic
│   └── index.html                   # Single HTML shell
├── banking.json                       # SQLite database (auto-created)
├── package.json
└── README.md
```

---

## Installation & Running

### Prerequisites
- Node.js v18+ and npm

### Steps

```bash
# 1. Clone or download the project
cd finapp

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# Navigate to http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

---

##  API Reference

### Auth
| Method | Endpoint             | Description          |
|--------|----------------------|----------------------|
| POST   | `/api/auth/register` | Create account       |
| POST   | `/api/auth/login`    | Sign in              |
| POST   | `/api/auth/logout`   | Sign out             |
| GET    | `/api/auth/me`       | Current user info    |
| PUT    | `/api/auth/budget`   | Update budget limit  |

### Transactions
| Method | Endpoint                       | Description              |
|--------|--------------------------------|--------------------------|
| GET    | `/api/transactions`            | List (with filters)      |
| GET    | `/api/transactions/summary`    | Dashboard summary + charts |
| POST   | `/api/transactions`            | Create transaction       |
| PUT    | `/api/transactions/:id`        | Update transaction       |
| DELETE | `/api/transactions/:id`        | Delete transaction       |
| GET    | `/api/transactions/export`     | Download CSV             |

---

## Database Schema

```sql
CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,        
  budget_limit REAL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  amount      REAL NOT NULL CHECK(amount > 0),
  category    TEXT NOT NULL,
  date        TEXT NOT NULL,
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Screenshots


---

## Future Improvements

- Recurring transactions
- Multi-currency support
- PDF report export
- Email notifications for budget alerts
- OAuth (Google) login
- Account balance history timeline
- Tags / custom categories
- Savings goals tracker

---

## Author

Built for the Financial Management Banking App – Beginner Track

**Team Size:** Solo 

---

## License

MIT

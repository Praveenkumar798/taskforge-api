# TaskForge API — Secure REST API with Auth & Rate Limiting

A production-ready REST API powering the TaskForge platform. Built as **Task 2** of the SWE Intern Hiring Assessment.

## Live Demo

> **API Base URL:** https://taskforge-api-vd3t.onrender.com
>
> **Health Check:** `GET /api/health`
>
> **Web Client (Task 1):** https://taskforge-web-chi.vercel.app

---

## Tech Stack & Key Decisions

| Choice | Why |
|---|---|
| **Node.js + Express** | Lightweight, fast I/O, massive middleware ecosystem. Express is the industry standard for REST APIs. |
| **PostgreSQL** | Relational data (users → tasks) with proper foreign keys and constraints. Chosen over MongoDB because task data has a clear schema. |
| **JWT (Access + Refresh)** | Access tokens (15min) in memory, refresh tokens (7 days) in httpOnly cookies. Never stored in localStorage — that's vulnerable to XSS. |
| **bcryptjs** | Password hashing with 12 salt rounds. Industry standard — not storing plaintext or weak hashes. |
| **express-rate-limit** | Rate limiting on auth endpoints (10/15min) to prevent brute-force attacks. General API limit at 100/15min. |
| **express-validator** | Input validation and sanitization on every endpoint. Rejects bad data before it reaches the database. |
| **Helmet.js** | Security headers: CSP, X-Frame-Options, HSTS, and more — out of the box. |
| **pg (node-postgres)** | Direct PostgreSQL driver with parameterized queries. No ORM overhead, no SQL injection risk. |

---

## Security Architecture

### Authentication Flow
```
Register/Login → Access Token (15min) + Refresh Token (httpOnly cookie, 7 days)
                                ↓
         API Request → Bearer token in Authorization header
                                ↓
              Token Expired → POST /auth/refresh → New access token
                                ↓
                Logout → Refresh token revoked from DB + cookie cleared
```

### Security Layers
1. **Helmet.js** — Security headers on every response
2. **CORS** — Whitelisted origins only (not `*`)
3. **Rate Limiting** — 10 attempts/15min on login/register
4. **JWT Verification** — Access token validated on every protected route
5. **RBAC** — Role-based middleware blocks unauthorized access
6. **Input Validation** — express-validator sanitizes all inputs
7. **Parameterized Queries** — No string concatenation in SQL (prevents SQLi)
8. **Password Hashing** — bcrypt with 12 salt rounds
9. **httpOnly Cookies** — Refresh tokens inaccessible to JavaScript
10. **Body Size Limit** — 10KB max request body to prevent payload attacks

---

## API Endpoints

| Method | Endpoint | Access | Rate Limited | Description |
|--------|----------|--------|:---:|-------------|
| `POST` | `/api/auth/register` | Public | ✅ | Create account |
| `POST` | `/api/auth/login` | Public | ✅ | Get tokens |
| `POST` | `/api/auth/refresh` | Public | — | Refresh access token |
| `POST` | `/api/auth/logout` | Public | — | Revoke refresh token |
| `GET` | `/api/auth/me` | Auth | — | Current user profile |
| `GET` | `/api/tasks` | Auth | — | List user's tasks (with filters) |
| `GET` | `/api/tasks/stats` | Auth | — | Task statistics |
| `GET` | `/api/tasks/:id` | Owner | — | Get single task |
| `POST` | `/api/tasks` | Auth | — | Create task |
| `PUT` | `/api/tasks/:id` | Owner | — | Update task |
| `DELETE` | `/api/tasks/:id` | Owner | — | Delete task |
| `GET` | `/api/admin/users` | Admin | — | List all users |
| `GET` | `/api/admin/users/:id` | Admin | — | User details |
| `DELETE` | `/api/admin/users/:id` | Admin | — | Delete user |
| `PATCH` | `/api/admin/users/:id/role` | Admin | — | Change user role |

Full endpoint documentation: [API_DOCS.md](./API_DOCS.md)

---

## Project Structure

```
src/
├── config/
│   ├── db.js               # PostgreSQL connection pool
│   ├── env.js              # Environment variable loader
│   └── initDb.js           # Database schema + seed script
├── controllers/
│   ├── authController.js   # Register, login, refresh, logout
│   ├── taskController.js   # Full CRUD + stats + filtering
│   └── adminController.js  # User management (admin only)
├── middleware/
│   ├── authenticate.js     # JWT verification
│   ├── authorize.js        # Role-based access control
│   ├── rateLimiter.js      # Auth + general rate limiters
│   ├── validate.js         # Input validation rules
│   └── errorHandler.js     # Global error + 404 handler
├── routes/
│   ├── auth.routes.js      # /api/auth/*
│   ├── task.routes.js      # /api/tasks/*
│   └── admin.routes.js     # /api/admin/*
├── utils/
│   └── tokens.js           # JWT generation + verification
└── server.js               # Express app entry point
```

---

## Setup & Run Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use Docker)

### Option A: Manual Setup
```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/taskforge-api.git
cd taskforge-api
npm install

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL URL and generate JWT secrets:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Initialize database (creates tables + seed admin)
npm run db:init

# Start development server
npm run dev
```

### Option B: Docker (Bonus)
```bash
cp .env.example .env
docker-compose up -d
# API at http://localhost:5000, PostgreSQL at localhost:5432
```

### Default Admin Account
```
Email: admin@taskforge.com
Password: Admin@123
```

---

## Deployment (Render)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect repo
3. Create a PostgreSQL database in Render dashboard
4. Set environment variables (copy from `.env.example`, use Render's Internal DB URL)
5. Build command: `npm install`
6. Start command: `npm start`
7. Run `npm run db:init` in the Render shell to initialize tables

---

## Tradeoffs & Decisions

- **No ORM (Sequelize/Prisma)**: Direct `pg` queries keep the API fast and transparent. For a 3-table schema, an ORM adds complexity without benefit.
- **Refresh tokens in DB, not Redis**: PostgreSQL is already in the stack. Redis would be faster but adds infrastructure for a small-scale API.
- **Single refresh token per user**: On login, old tokens are revoked. This prevents token accumulation but means logging in from a new device logs out the old one.
- **httpOnly cookies for refresh tokens**: More secure than localStorage (immune to XSS), but requires CORS `credentials: true` and `sameSite` configuration.

---

## Author

**Praveenkumar** — SWE Intern Candidate

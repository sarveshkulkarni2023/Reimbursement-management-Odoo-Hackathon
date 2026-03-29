# Reimbursement Management System

A full-stack enterprise reimbursement and expense management platform built with TypeScript, React, and Express. This monorepo system manages employee expense submissions, multi-level approval workflows, and company expense analytics.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

The Reimbursement Management System is a comprehensive solution for organizations to manage employee expense reimbursements. It supports complex approval workflows, multi-currency transactions with automatic conversion, and role-based access control.

### Key Capabilities

- **User Management**: Admin, Manager, and Employee roles with fine-grained permissions
- **Expense Tracking**: Submit, track, and manage employee expenses with OCR receipt scanning
- **Multi-Currency Support**: Automatic currency conversion with real-time exchange rates
- **Approval Workflows**: Configurable multi-step approval rules with various approval conditions
- **Analytics Dashboard**: Visual insights into expense patterns and spending trends
- **Token-Based Authentication**: Secure JWT-style token authentication with password hashing

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js (v24)
- **Framework**: Express.js 5
- **Language**: TypeScript 5.9
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod (v4) with `drizzle-zod` for schema integration
- **Build Tool**: esbuild
- **Logging**: Pino (with HTTP middleware)
- **Authentication**: Token-based with SHA256 password hashing

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (based on Radix UI)
- **Charts**: Recharts
- **State Management**: React Query (TanStack Query)
- **Form Handling**: React Hook Form with Zod validation
- **API Client**: Auto-generated from OpenAPI spec via Orval

### Shared Libraries
- **Package Manager**: pnpm (with workspaces)
- **Package Management**: pnpm workspaces for monorepo structure
- **Type Checking**: TypeScript with composite projects
- **Code Generation**: Orval (OpenAPI → TypeScript client)
- **Formatting**: Prettier

---

## ✨ Features

### 1. **User Roles & Permissions**

#### Admin
- Automatically created on company signup
- Full system access and visibility into all expenses
- User management (create, edit, delete users)
- Approval rule configuration and management
- Company settings management
- Can override approvals and override approval decisions

#### Manager
- Approve or reject team member expenses
- View team expense reports
- Can be designated as "manager approver" (via `IS_MANAGER_APPROVER` flag)
- Cannot override approvals (except when within their role boundaries)

#### Employee
- Submit new expense claims
- View personal expense history and status
- Upload receipts for claims
- Check approval status of submitted expenses

### 2. **Expense Management**

- **Create Expenses**: Submit with amount, currency, category, date, and receipt URL
- **Automatic Currency Conversion**: Expenses in foreign currencies are automatically converted to company currency using real-time exchange rates
- **Receipt Management**: Support for receipt URLs with OCR capability
- **Expense Categories**: Predefined categories (Travel, Meals, Office Supplies, etc.)
- **Status Tracking**: Draft → Submitted → Approved/Rejected → Reimbursed

### 3. **Approval Workflows**

#### Approval Rule Types
- **Sequential**: All approvers must approve in order (1→2→3)
- **Percentage**: Requires approval from N% of designated approvers
- **Specific Approver**: Must be approved by specific role (e.g., CFO) for auto-approval
- **Hybrid**: Combination of percentage and specific approver conditions

#### Features
- Multi-step approval chains
- Parallel and sequential approval options
- Comments and notes on approval actions
- Rejection with feedback required
- Audit trail of all approval actions

### 4. **Currency & Exchange Rates**

- **Multi-Currency Support**: Expenses can be submitted in any currency
- **Automatic Conversion**: Real-time conversion to company's base currency
- **Exchange Rate Caching**: Rates cached for 1 hour to optimize API calls
- **Country-Currency Mapping**: Cached country data from REST Countries API

### 5. **Analytics Dashboard**

- **Summary Statistics**: Total expenses, approved, pending, rejected counts
- **Visual Charts**: 
  - Bar charts showing expense trends over time
  - Pie charts for expense category breakdown
- **Filter & Export**: View by date range, category, status
- **Company Insights**: Team spending analysis and patterns

---

## 📁 Project Structure

```
reimbursement-management-system/
├── artifacts/                      # Application packages
│   ├── api-server/                 # Express REST API backend
│   │   ├── src/
│   │   │   ├── app.ts             # Express app setup
│   │   │   ├── index.ts           # Server entry point
│   │   │   ├── lib/
│   │   │   │   ├── auth.ts        # Auth utilities (JWT, password hashing)
│   │   │   │   └── logger.ts      # Pino logger setup
│   │   │   └── routes/             # API route handlers
│   │   │       ├── auth.ts        # Authentication endpoints
│   │   │       ├── users.ts       # User management
│   │   │       ├── company.ts     # Company info & settings
│   │   │       ├── expenses.ts    # Expense CRUD & OCR
│   │   │       ├── approvalRules.ts # Approval rule management
│   │   │       ├── currency.ts    # Currency & exchange rates
│   │   │       ├── analytics.ts   # Dashboard analytics
│   │   │       └── health.ts      # Health check endpoint
│   │   ├── build.mjs              # esbuild configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── reimbursement-app/          # React Vite frontend
│   │   ├── src/
│   │   │   ├── App.tsx            # Main app component
│   │   │   ├── main.tsx           # React entry point
│   │   │   ├── pages/             # Page components
│   │   │   │   ├── login.tsx      # Login page
│   │   │   │   ├── signup.tsx     # Signup page
│   │   │   │   ├── dashboard.tsx  # Dashboard with analytics
│   │   │   │   ├── settings.tsx   # Company settings
│   │   │   │   ├── not-found.tsx  # 404 page
│   │   │   │   ├── expenses/      # Expense management pages
│   │   │   │   ├── approvals/     # Approval workflow pages
│   │   │   │   ├── users/         # User management pages
│   │   │   │   └── approval-rules/ # Approval rule configuration
│   │   │   ├── components/        # Reusable components
│   │   │   │   ├── ui/            # UI components from shadcn/ui
│   │   │   │   └── layout/        # Layout components (Sidebar, Header)
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   │   ├── use-auth.ts    # Auth state & context
│   │   │   │   ├── use-expenses.ts # Expense data management
│   │   │   │   ├── use-users.ts   # User management
│   │   │   │   ├── use-company.ts # Company info
│   │   │   │   └── use-mobile.tsx # Mobile responsiveness
│   │   │   ├── lib/
│   │   │   │   ├── api.ts         # API client with auth
│   │   │   │   └── utils.ts       # Utility functions
│   │   │   └── index.css          # Global styles
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mockup-sandbox/             # UI component showcase
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── mockups/       # Component examples
│       │   │   └── ui/            # Re-exported shadcn components
│       │   └── main.tsx
│       └── vite.config.ts
│
├── lib/                            # Shared libraries
│   ├── api-spec/                   # OpenAPI specification
│   │   ├── openapi.yaml          # Complete API spec
│   │   ├── orval.config.ts        # Code generation config
│   │   └── package.json
│   │
│   ├── api-client-react/           # Generated React Query hooks
│   │   ├── src/
│   │   │   ├── index.ts           # Main exports
│   │   │   ├── custom-fetch.ts    # Fetch wrapper with auth
│   │   │   └── generated/
│   │   │       ├── api.ts         # Generated API hooks
│   │   │       └── api.schemas.ts # Generated types
│   │   └── package.json
│   │
│   ├── api-zod/                    # Generated Zod schemas
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── generated/
│   │   │       ├── api.ts         # API functions
│   │   │       └── types/         # Type definitions
│   │   └── package.json
│   │
│   └── db/                         # Database schema & ORM
│       ├── src/
│       │   ├── index.ts           # DB connection & exports
│       │   └── schema/
│       │       ├── companies.ts   # Company table schema
│       │       ├── users.ts       # User table with roles
│       │       ├── expenses.ts    # Expense table
│       │       ├── approvalRules.ts # Approval rules
│       │       ├── approvalActions.ts # Approval action logs
│       │       └── index.ts       # Schema exports
│       ├── drizzle.config.ts      # Drizzle migration config
│       └── package.json
│
├── scripts/                        # Build and utility scripts
│   ├── src/
│   │   └── hello.ts
│   └── package.json
│
├── pnpm-workspace.yaml             # Workspace definition
├── pnpm-lock.yaml                  # pnpm lock file (auto-generated)
├── tsconfig.base.json              # Base TypeScript config
├── tsconfig.json                   # Root TypeScript config (composite projects)
├── package.json                    # Root dependencies
└── replit.md                       # Replit deployment guide
```

---

## 🚀 Installation

### Prerequisites
- **Node.js**: v24 or later
- **pnpm**: Latest version (install via `npm install -g pnpm`)
- **PostgreSQL**: 12 or later
- **Git**: For version control

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd reimbursement-management-system
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Create `.env` files in respective packages:

   **For `artifacts/api-server/.env`:**
   ```bash
   NODE_ENV=development
   PORT=8080
   DATABASE_URL=postgresql://user:password@localhost:5432/reimbursement_db
   LOG_LEVEL=info
   ```

   **For `artifacts/reimbursement-app/.env`:**
   ```bash
   VITE_API_URL=http://localhost:8080/api
   ```

4. **Create and migrate database**
   ```bash
   pnpm --filter @workspace/db run push
   ```
   This command uses Drizzle Migrations to set up your PostgreSQL schema.

5. **TypeScript typecheck**
   ```bash
   pnpm run typecheck
   ```

---

## 💻 Development

### Start Development Servers

**Terminal 1 - Backend API:**
```bash
pnpm --filter @workspace/api-server run dev
```
Server runs on `http://localhost:8080`

**Terminal 2 - Frontend:**
```bash
pnpm --filter @workspace/reimbursement-app run dev
```
App runs on `http://localhost:5173` (or as shown in terminal output)

### Available Scripts

#### Root Level
- `pnpm run build` — Full project build with type checking
- `pnpm run typecheck` — Type check all packages with TypeScript composite projects
- `pnpm run typecheck:libs` — Type check only shared libraries

#### API Server
- `pnpm --filter @workspace/api-server run dev` — Start development server with hot reload
- `pnpm --filter @workspace/api-server run build` — Build for production
- `pnpm --filter @workspace/api-server run typecheck` — Type check backend code

#### Frontend App
- `pnpm --filter @workspace/reimbursement-app run dev` — Start dev server
- `pnpm --filter @workspace/reimbursement-app run build` — Build for production (creates `dist/`)
- `pnpm --filter @workspace/reimbursement-app run serve` — Preview production build
- `pnpm --filter @workspace/reimbursement-app run typecheck` — Type check frontend code

#### Database
- `pnpm --filter @workspace/db run push` — Create/migrate database schema
- `pnpm --filter @workspace/db run studio` — Open Drizzle Studio for visual DB management

#### Code Generation
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API client from OpenAPI spec

### TypeScript Composite Projects

This monorepo uses TypeScript composite projects for proper cross-package type checking:

- **Always typecheck from root**: Run `pnpm run typecheck` to ensure all packages build in correct dependency order
- **Individual package checking**: Run typecheck within a package only after checking root
- **emitDeclarationOnly**: TypeScript only emits `.d.ts` files; actual bundling is handled by esbuild/Vite
- **Project references**: Each package's `tsconfig.json` references its dependencies via the `references` array

---

## 📡 API Documentation

### Base URL
```
http://localhost:8080/api
```

### Authentication

All protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```

### Main Endpoints

#### Authentication
- `POST /auth/signup` — Create new admin account & company
- `POST /auth/login` — Login and receive token
- `POST /auth/logout` — Logout and clear session
- `GET /auth/me` — Get current user information

#### Company
- `GET /company` — Get company information
- `PUT /company` — Update company details (Admin only)

#### Users
- `GET /users` — List company users
- `POST /users` — Create new user (Admin only)
- `PUT /users/:id` — Update user (Admin only)
- `DELETE /users/:id` — Delete user (Admin only)

#### Expenses
- `GET /expenses` — List expenses (filtered by role)
- `POST /expenses` — Submit new expense
- `GET /expenses/:id` — Get expense details
- `PUT /expenses/:id` — Update expense (Employee, before submission)
- `DELETE /expenses/:id` — Delete expense (Employee, before submission)
- `POST /expenses/ocr` — Extract data from receipt image

#### Approvals
- `GET /approvals` — List pending approvals
- `POST /approvals/:expenseId/approve` — Approve an expense
- `POST /approvals/:expenseId/reject` — Reject an expense with feedback

#### Approval Rules
- `GET /approval-rules` — List company approval rules
- `POST /approval-rules` — Create new approval rule (Admin only)
- `PUT /approval-rules/:id` — Update approval rule (Admin only)
- `DELETE /approval-rules/:id` — Delete approval rule (Admin only)

#### Currency
- `GET /currency/rates` — Get current exchange rates
- `GET /currency/countries` — Get country/currency mappings

#### Health
- `GET /healthz` — Health check endpoint

### Response Formats

**Success Response:**
```json
{
  "data": { /* response data */ },
  "status": "success"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "status": "error"
}
```

### OpenAPI Specification

Complete API specification is available in [lib/api-spec/openapi.yaml](lib/api-spec/openapi.yaml). View interactive documentation after starting the server.

---

## 🗄 Database Schema

### Tables

#### `companies`
- `id` (UUID, primary key)
- `name` (string) — Company name
- `country` (string) — Company headquarters country
- `currency` (string) — Base currency code (e.g., "USD")
- `currencySymbol` (string) — Currency symbol (e.g., "$")
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### `users`
- `id` (UUID, primary key)
- `companyId` (UUID, FK to companies)
- `email` (string, unique) — User email
- `passwordHash` (string) — SHA256 hashed password
- `firstName` (string)
- `lastName` (string)
- `role` (enum: admin | manager | employee)
- `managerId` (UUID, FK to users, nullable) — Direct manager
- `isManagerApprover` (boolean) — Can approve expenses
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### `expenses`
- `id` (UUID, primary key)
- `companyId` (UUID, FK to companies)
- `submittedBy` (UUID, FK to users)
- `amount` (decimal)
- `currency` (string) — Submitted currency
- `amountInCompanyCurrency` (decimal) — Auto-converted amount
- `category` (enum: Travel | Meals | Office Supplies | Equipment | Other)
- `status` (enum: Draft | Submitted | Approved | Rejected | Reimbursed)
- `description` (string)
- `receiptUrl` (string, nullable)
- `submissionDate` (date)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### `approval_rules`
- `id` (UUID, primary key)
- `companyId` (UUID, FK to companies)
- `name` (string) — Rule name
- `conditionType` (enum: sequential | percentage | specific_approver | hybrid)
- `percentageRequired` (integer, nullable) — For percentage rule
- `specificApproverId` (UUID, FK to users, nullable) — For specific approver rule
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

#### `approval_steps`
- `id` (UUID, primary key)
- `ruleId` (UUID, FK to approval_rules)
- `approverId` (UUID, FK to users)
- `step` (integer) — Order in approval sequence
- `createdAt` (timestamp)

#### `approval_actions`
- `id` (UUID, primary key)
- `expenseId` (UUID, FK to expenses)
- `approverId` (UUID, FK to users)
- `action` (enum: Approved | Rejected)
- `comments` (string, nullable)
- `actionDate` (timestamp)
- `createdAt` (timestamp)

---

## 🌍 External APIs

The system integrates with the following external services:

### 1. REST Countries API
**Purpose**: Fetch country and currency information  
**Endpoint**: `https://restcountries.com/v3.1/all?fields=name,currencies`  
**Cache Duration**: 24 hours  
**Used for**: Company currency selection, country mapping

### 2. Exchange Rate API
**Purpose**: Real-time currency conversion rates  
**Endpoint**: `https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}`  
**Cache Duration**: 1 hour  
**Used for**: Converting expenses to company currency

---

## 🏗 Deployment

### Building for Production

```bash
# Build all packages with type checking
pnpm run build

# Build individual packages
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/reimbursement-app run build
```

### Backend Deployment

1. **Build the server:**
   ```bash
   pnpm --filter @workspace/api-server run build
   ```
   Creates `dist/index.mjs`

2. **Set environment variables** in your hosting environment:
   ```
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=postgresql://...
   LOG_LEVEL=info
   ```

3. **Run the server:**
   ```bash
   node --enable-source-maps ./dist/index.mjs
   ```

### Frontend Deployment

1. **Build the app:**
   ```bash
   pnpm --filter @workspace/reimbursement-app run build
   ```
   Creates optimized files in `dist/`

2. **Deploy static files** to your hosting service (Vercel, Netlify, AWS S3, etc.)

3. **Set API URL** in environment:
   ```
   VITE_API_URL=https://api.yourdomain.com/api
   ```

4. **Configure reverse proxy** to route API requests to your backend

### Replit Deployment

See [replit.md](replit.md) for complete Replit deployment instructions.

---

## 🤝 Contributing

### Getting Started

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes following the code style
3. Commit with clear messages: `git commit -m "feat: description"`
4. Push and create a Pull Request

### Code Style

- Use **Prettier** for formatting (runs on pre-commit)
- Follow **TypeScript** strict mode best practices
- Write clear, self-documenting code with comments for complex logic
- Use **semantic variable/function names**

### Testing

- Write unit tests for utilities and business logic
- Test API endpoints with various user roles
- Test UI components with different states and viewport sizes
- Run tests before committing: `pnpm run test`

### Pull Request Guidelines

- One feature/fix per PR
- Include clear description of changes
- Reference related issues
- Update documentation if adding features
- Ensure CI tests pass

---

## 📝 License

MIT License - See LICENSE file for details

---

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the dev team
- Check existing documentation

---

## 🎓 Additional Resources

- [OpenAPI Specification](lib/api-spec/openapi.yaml)
- [pnpm Workspace Documentation](https://pnpm.io/workspaces)
- [TypeScript Composite Projects](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Express.js Guide](https://expressjs.com)
- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**Last Updated**: March 2026  
**Version**: 1.0.0  
**Status**: Active Development
update 
update 

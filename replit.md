# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a full-stack **Reimbursement Management System**.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Token-based (in-memory store, SHA256 hashed passwords)

## Application Features

### Roles
- **Admin**: Company + admin auto-created on signup. Manages users, roles, approval rules. Full expense visibility. Can override approvals.
- **Manager**: Approves/rejects team expenses. Can be set as "manager approver" (IS_MANAGER_APPROVER).
- **Employee**: Submits expenses, views own expense history.

### Core Flows
1. **Auth**: Signup creates company + admin. Login returns token stored in localStorage.
2. **Expense Submission**: Employees submit with amount, currency (auto-converted to company currency via exchangerate-api), category, date, receipt URL. Supports OCR via `/api/expenses/ocr`.
3. **Approval Workflow**: Multi-step sequential approval. Manager approved first if IS_MANAGER_APPROVER is set.
4. **Conditional Approval Rules**: Sequential | Percentage (60% of approvers) | Specific Approver (CFO approves → auto-approved) | Hybrid (percentage OR specific approver).
5. **Dashboard**: Stats cards, bar + pie charts for expense breakdown.

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   └── src/
│   │       ├── lib/auth.ts      # Token auth, password hashing
│   │       └── routes/          # auth, company, users, expenses, approvalRules, currency, analytics
│   └── reimbursement-app/  # React + Vite frontend
│       └── src/
│           ├── pages/           # login, signup, dashboard, expenses, approvals, users, approval-rules, settings
│           ├── hooks/           # use-auth, use-expenses, use-users, use-company
│           ├── components/      # ui/index (Button, Input, Card, Badge, etc.), layout/Sidebar, Layout
│           └── lib/             # api.ts (fetch with auth), utils.ts
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── companies.ts
│           ├── users.ts        # userRoleEnum
│           ├── expenses.ts     # expenseCategoryEnum, expenseStatusEnum
│           ├── approvalRules.ts # conditionTypeEnum, approvalRules, approvalSteps
│           └── approvalActions.ts # approvalActionEnum
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## External APIs Used

- `https://restcountries.com/v3.1/all?fields=name,currencies` — country/currency list (cached 24h)
- `https://api.exchangerate-api.com/v4/latest/{BASE_CURRENCY}` — currency conversion (cached 1h)

## Database Schema

- `companies` — company info (name, country, currency, currencySymbol)
- `users` — user accounts with role (admin/manager/employee), managerId FK, isManagerApprover flag
- `expenses` — expense claims with amount, currency, amountInCompanyCurrency, category, status
- `approval_rules` — named approval workflows with conditionType (sequential/percentage/specific_approver/hybrid)
- `approval_steps` — ordered steps within a rule, each pointing to an approver user
- `approval_actions` — actual approval/rejection actions on expenses, with step tracking

## Development

- `pnpm --filter @workspace/api-server run dev` — start API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/reimbursement-app run dev` — start frontend (port 23333, proxied at /)
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client hooks

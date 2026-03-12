# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a rental property management dashboard application built with Next.js 15 and a PHP backend API. The application manages properties, tenants, invoices, transactions, stock/inventory, prepaid utilities, and financial reporting for rental businesses.

## Development Commands

### Running the Application

**IMPORTANT**: You need to run TWO servers during development:

1. **PHP API Server** (in one terminal):
```bash
npm run api          # Starts PHP server at http://localhost:8000
```

2. **Next.js Frontend** (in another terminal):
```bash
npm run dev          # Start Next.js dev server on http://localhost:3000
```

### Other Commands
```bash
npm run build        # Build for production (static export)
npm run start        # Start production server
npm run lint         # Run ESLint
npm run export       # Export static site
```

### PHP Backend API
The PHP API is located in `app/api/` and must be run separately. Requirements:
- PHP 7.4+ with PDO MySQL extension
- Composer for dependency management (optional, dependencies already vendored)
- Firebase PHP-JWT library (already included in `app/api/vendor/`)

## Architecture

### Hybrid Next.js + PHP Architecture

This application uses an unusual but intentional architecture with:

1. **Next.js Frontend** (Static Export)
   - Configured for static export (`output: 'export'` in next.config.mjs)
   - Client-side routing with App Router
   - All pages are client components (`"use client"`)
   - No server-side rendering or API routes in Next.js

2. **Separate PHP Backend API**
   - Located in `app/api/` directory (within the Next.js project for convenience)
   - RESTful API with custom routing in `app/api/index.php`
   - Controllers follow MVC pattern: `*Controller.php` files
   - Database connection configured in `app/api/config.php`
   - CORS enabled for localhost:3000 and localhost:8000

**Important**: The PHP API runs on a separate server (port 8000) from Next.js (port 3000).

### API Configuration

- API URL is configured via environment variable `NEXT_PUBLIC_API_URL` in `.env.local`
- Default development URL: `http://localhost:8000`
- All API calls use the `getApiUrl()` helper from `lib/api-config.ts`
- For production, update `.env.local` or set the environment variable to your production API URL

### Frontend Structure

- **App Router Layout**: Uses route groups for organization
  - `app/(dashboard)/` - All authenticated pages
  - `app/(dashboard)/layout.tsx` - Main dashboard layout with sidebar and React Query provider
  - Route-based navigation via Next.js App Router

- **State Management**:
  - TanStack Query (React Query) for server state
  - QueryClient initialized in dashboard layout (`app/(dashboard)/layout.tsx`)
  - Local storage for `selectedCompanyId` and authentication

- **UI Framework**:
  - shadcn/ui components in `components/ui/`
  - Radix UI primitives
  - Tailwind CSS for styling
  - Custom sidebar component (`components/app-sidebar.tsx`)

- **Data Fetching Pattern**:
  - Pages use `fetch()` API to call PHP backend at `https://thynkxpro.co.za/api/`
  - Company ID from localStorage is passed as query parameter
  - Standard error handling with try/catch

### Backend Structure

- **Entry Point**: `app/api/index.php` - handles routing to controllers
- **Database**: `app/api/config.php` - PDO connection class
- **Controllers**: RESTful controllers handling CRUD operations
  - `PropertyController.php` - Properties and units
  - `TenantController.php` - Tenant management
  - `InvoiceController.php` - Invoice generation and management
  - `TransactionController.php` - Financial transactions, deposits, expenses
  - `DashboardController.php` - Dashboard statistics
  - `StockController.php` - Inventory management
  - `UtilitiesController.php` - Prepaid electricity/water
  - `CalendarController.php` - Calendar events
  - `DocumentController.php` - Tenant document uploads
  - `CompanyController.php` - Multi-company support
  - `AuthController.php` - Authentication

### Key Patterns

1. **Route Structure**:
   - Dashboard pages: `app/(dashboard)/{section}/{page}/page.tsx`
   - Loading states: `app/(dashboard)/{section}/loading.tsx`
   - All routes under `(dashboard)` share the sidebar layout

2. **Navigation**:
   - Sidebar menu defined in `components/app-sidebar.tsx`
   - Collapsible sections for Properties, Tenants, Income, Expenses, Transactions, Reports, Prepaid, Stock, Documents, Calendar
   - Active route highlighting via `usePathname()`

3. **Multi-Company**:
   - Application supports multiple companies
   - `selectedCompanyId` stored in localStorage
   - All API requests include `company_id` parameter
   - Company selection happens before accessing dashboard

4. **Authentication**:
   - JWT-based authentication (Firebase PHP-JWT)
   - Session management via PHP sessions
   - Logout clears localStorage and sessionStorage

## Important Considerations

1. **Build Configuration**:
   - TypeScript and ESLint errors are ignored during build (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`)
   - Images are unoptimized (`unoptimized: true`)
   - Static export enabled

2. **API Integration**:
   - API URL is configured via `NEXT_PUBLIC_API_URL` environment variable (default: `http://localhost:8000`)
   - Use `getApiUrl()` helper from `lib/api-config.ts` for all API calls
   - When working with API endpoints, always include company_id from localStorage
   - Never hardcode API URLs - always use the helper function

3. **Component Libraries**:
   - Full shadcn/ui component suite installed
   - Recharts for data visualization
   - Lucide React for icons
   - React Hook Form + Zod for form validation
   - React Big Calendar for calendar views
   - jsPDF for PDF generation

4. **Path Aliases**:
   - `@/` maps to project root
   - Use `@/components/`, `@/lib/`, `@/hooks/` for imports

5. **Database Credentials**:
   - Database configuration is in `app/api/config.php` (credentials are currently exposed in code)
   - When deploying or sharing, ensure credentials are moved to environment variables

## Common Development Tasks

### Setting Up Development Environment
1. Clone the repository
2. Run `npm install`
3. Copy `.env.example` to `.env.local`
4. Start PHP API: `npm run api` (in one terminal)
5. Start Next.js: `npm run dev` (in another terminal)
6. Access the app at `http://localhost:3000`

### Adding a New Page
1. Create page in `app/(dashboard)/{section}/{page}/page.tsx`
2. Add `"use client"` directive at the top
3. Import `getApiUrl` from `@/lib/api-config` for API calls
4. Add route to sidebar in `components/app-sidebar.tsx`
5. Create corresponding loading state if needed

### Making API Calls
Always use the `getApiUrl()` helper:
```typescript
import { getApiUrl } from "@/lib/api-config"

// ✅ Correct
const response = await fetch(getApiUrl(`tenants?company_id=${companyId}`))

// ❌ Wrong - never hardcode URLs
const response = await fetch("http://localhost:8000/tenants?company_id=1")
```

### Adding a New API Endpoint
1. Create or modify controller in `app/api/{Name}Controller.php`
2. Add route handling in `app/api/index.php`
3. Test with `http://localhost:8000/{endpoint}`

### Working with Forms
- Use React Hook Form with Zod resolver
- shadcn/ui Form components for consistent styling
- See existing invoice/tenant forms for patterns

### Generating PDFs
- jsPDF and jsPDF-autotable are available
- html2canvas for capturing DOM elements
- See reports pages for PDF generation examples

### Troubleshooting
- If API calls fail, ensure both servers are running (`npm run api` and `npm run dev`)
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- For CORS issues, verify CORS headers in `app/api/config.php` and `app/api/index.php`

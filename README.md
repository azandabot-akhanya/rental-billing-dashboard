# Rental Billing Dashboard

A comprehensive property management system designed to streamline rental property operations, tenant management, financial tracking, and reporting. Built with modern web technologies, this application provides property managers with powerful tools to manage properties, tenants, invoices, transactions, inventory, and prepaid utilities all in one place.

**Developed by:** [Siyanda Zama](https://github.com/siyanda-zama)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The Rental Billing Dashboard is a full-stack application that combines a modern React-based frontend with a robust PHP backend API. It's designed to handle the complete lifecycle of rental property management, from property and tenant onboarding to financial reporting and document management.

### Why This Stack?

This project uses a hybrid architecture combining Next.js (static export) with a PHP backend API. This approach offers:

- **Static Frontend Deployment**: The Next.js frontend exports to static files, making it easy to deploy on any hosting platform
- **Mature Backend**: PHP provides a stable, well-tested backend with extensive hosting support
- **Separation of Concerns**: Frontend and backend can be deployed, scaled, and maintained independently
- **Cost-Effective**: Both technologies have extensive free and affordable hosting options

---

## Features

### Property Management
- **Multi-Property Support**: Manage multiple properties with detailed information
- **Unit Management**: Track individual units within properties
- **Property Analytics**: View occupancy rates, revenue, and performance metrics

### Tenant Management
- **Tenant Profiles**: Comprehensive tenant information and contact details
- **Lease Tracking**: Monitor lease agreements, start dates, and renewals
- **Tenant Groups**: Organize tenants by property, unit, or custom criteria
- **Document Storage**: Upload and manage tenant documents securely

### Financial Management
- **Invoice Generation**: Create one-time and recurring invoices automatically
- **Payment Tracking**: Record and monitor tenant payments
- **Expense Management**: Track property-related expenses by category
- **Transaction History**: Complete audit trail of all financial activities
- **Opening Balances**: Set and manage opening balances for tenants
- **Bank Transfers**: Record inter-account transfers

### Reporting & Analytics
- **Dashboard Overview**: Real-time metrics and key performance indicators
- **Financial Reports**: Income statements, expense reports, and balance sheets
- **Tenant Statements**: Generate detailed statements for individual tenants
- **Custom Reports**: Filter and export reports by date range, property, or tenant
- **PDF Export**: Professional PDF generation for invoices, receipts, and reports

### Inventory & Stock Management
- **Stock Tracking**: Monitor inventory levels and movements
- **Supplier Management**: Track suppliers and purchase orders
- **Stock Issuance**: Record items issued to tenants or properties
- **Stock Reports**: Analyze stock levels by supplier, tenant, or total inventory

### Prepaid Utilities
- **Electricity Management**: Track prepaid electricity purchases and usage
- **Water Management**: Monitor prepaid water transactions
- **Utility Reports**: Generate consumption reports by property or tenant

### Additional Features
- **Calendar Integration**: Schedule and track property-related events
- **Email Notifications**: Automated invoice delivery via email
- **Multi-Company Support**: Manage multiple companies from one installation
- **User Authentication**: Secure JWT-based authentication
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

---

## Technology Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - High-quality React components built on Radix UI
- **[TanStack Query](https://tanstack.com/query)** - Powerful async state management
- **[React Hook Form](https://react-hook-form.com/)** - Performant form validation
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation
- **[Recharts](https://recharts.org/)** - Composable charting library
- **[Lucide React](https://lucide.dev/)** - Beautiful icon library
- **[jsPDF](https://github.com/parallax/jsPDF)** - PDF generation
- **[React Big Calendar](https://github.com/jquense/react-big-calendar)** - Calendar component
- **[date-fns](https://date-fns.org/)** - Modern date utility library

### Backend
- **[PHP 7.4+](https://www.php.net/)** - Server-side scripting language
- **[PDO MySQL](https://www.php.net/manual/en/book.pdo.php)** - Database abstraction layer
- **[Firebase PHP-JWT](https://github.com/firebase/php-jwt)** - JWT authentication
- **[Composer](https://getcomposer.org/)** - PHP dependency management
- **MySQL/MariaDB** - Relational database management system

### Development Tools
- **[ESLint](https://eslint.org/)** - JavaScript linting
- **[PostCSS](https://postcss.org/)** - CSS transformation
- **[Autoprefixer](https://github.com/postcss/autoprefixer)** - CSS vendor prefixing

---

## Architecture

### System Design

The application follows a modern client-server architecture:

```
┌─────────────────────────────────────┐
│     Next.js Frontend (Port 3000)    │
│  - Static Export                    │
│  - React Components                 │
│  - TanStack Query                   │
│  - Client-side Routing              │
└──────────────┬──────────────────────┘
               │
               │ HTTP/REST API
               │
┌──────────────▼──────────────────────┐
│     PHP Backend API (Port 8000)     │
│  - RESTful Controllers              │
│  - JWT Authentication               │
│  - Business Logic                   │
└──────────────┬──────────────────────┘
               │
               │ PDO
               │
┌──────────────▼──────────────────────┐
│          MySQL Database             │
│  - Relational Data                  │
│  - Stored Procedures                │
│  - Triggers                         │
└─────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Static Export**: The Next.js frontend is configured for static export, enabling deployment on any static hosting platform
2. **Separate API Server**: The PHP API runs independently, allowing flexible deployment options
3. **RESTful API**: Clean, predictable API endpoints following REST conventions
4. **JWT Authentication**: Stateless authentication for scalability
5. **Client-Side State Management**: TanStack Query handles server state caching and synchronization

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **pnpm**
- **PHP** (v7.4 or higher) - [Download](https://www.php.net/downloads)
- **Composer** (optional, dependencies are vendored) - [Download](https://getcomposer.org/)
- **MySQL/MariaDB** (v5.7 or higher) - [Download](https://www.mysql.com/downloads/)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/siyanda-zama/rental-billing-dashboard.git
   cd rental-billing-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and set your API URL:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Set up the database**
   - Create a new MySQL database
   - Import the schema from `database-setup.sql`
   - Update database credentials in `app/api/config.php`

5. **Start the development servers**

   You need to run **two servers** during development:

   **Terminal 1 - PHP API Server:**
   ```bash
   npm run api
   ```
   This starts the PHP server at `http://localhost:8000`

   **Terminal 2 - Next.js Frontend:**
   ```bash
   npm run dev
   ```
   This starts the Next.js dev server at `http://localhost:3000`

6. **Access the application**

   Open your browser and navigate to `http://localhost:3000`

For detailed installation instructions for Mac and Windows, see [INSTALLATION.md](./INSTALLATION.md).

---

## Project Structure

```
rental-billing-dashboard/
├── app/
│   ├── (dashboard)/          # Dashboard routes (App Router)
│   │   ├── dashboard/        # Main dashboard page
│   │   ├── properties/       # Property management
│   │   ├── tenants/          # Tenant management
│   │   ├── income/           # Invoices, payments, quotes
│   │   ├── expenses/         # Expense tracking
│   │   ├── transactions/     # Financial transactions
│   │   ├── reports/          # Financial reports
│   │   ├── prepaid/          # Utility management
│   │   ├── stock/            # Inventory management
│   │   ├── documents/        # Document management
│   │   ├── calendar/         # Calendar events
│   │   └── layout.tsx        # Dashboard layout with sidebar
│   ├── api/                  # PHP Backend API
│   │   ├── index.php         # API router
│   │   ├── config.php        # Database configuration
│   │   ├── *Controller.php   # API controllers
│   │   └── vendor/           # PHP dependencies
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── app-sidebar.tsx       # Main navigation sidebar
├── lib/
│   ├── api-config.ts         # API URL configuration
│   └── utils.ts              # Utility functions
├── hooks/                    # Custom React hooks
├── public/                   # Static assets
├── styles/                   # Global styles
├── .env.local                # Environment variables (not in git)
├── .env.example              # Environment variables template
├── next.config.mjs           # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Node.js dependencies
└── database-setup.sql        # Database schema
```

---

## Documentation

Comprehensive documentation is available in the following files:

- **[INSTALLATION.md](./INSTALLATION.md)** - Detailed setup instructions for Mac and Windows
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design decisions
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API endpoint reference
- **[CLAUDE.md](./CLAUDE.md)** - Project instructions for AI-assisted development
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guidelines for contributing to the project

---

## Development

### Available Scripts

```bash
# Start PHP API server (localhost:8000)
npm run api

# Start Next.js development server (localhost:3000)
npm run dev

# Build for production (static export)
npm run build

# Run ESLint
npm run lint

# Export static site
npm run export
```

### Development Workflow

1. **Run both servers**: Always run `npm run api` and `npm run dev` in separate terminals
2. **Hot reload**: Next.js automatically reloads on file changes
3. **API changes**: PHP changes require restarting the API server
4. **Type safety**: TypeScript provides compile-time type checking
5. **Linting**: ESLint ensures code quality and consistency

### Environment Variables

The application uses environment variables for configuration:

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

In production, update this to your production API URL.

---

## Deployment

### Frontend Deployment

The Next.js frontend exports to static files, compatible with any static hosting:

```bash
npm run build
```

This creates an `out/` directory with static files. Deploy to:
- Vercel
- Netlify
- GitHub Pages
- Any static file host

### Backend Deployment

The PHP API can be deployed to any PHP hosting:

1. Upload `app/api/` directory to your server
2. Update database credentials in `config.php`
3. Ensure PHP 7.4+ with PDO MySQL extension
4. Configure web server to route requests to `index.php`

See [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) for detailed instructions.

---

## Security Considerations

**IMPORTANT**: Before deploying to production:

1. **Database Credentials**: Move database credentials from `app/api/config.php` to environment variables
2. **API Keys**: Never commit API keys or secrets to version control
3. **CORS Configuration**: Update CORS settings in `app/api/index.php` for production domains
4. **HTTPS**: Always use HTTPS in production
5. **Input Validation**: The API includes input validation, but review for your use case
6. **SQL Injection**: The application uses PDO prepared statements for security

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Guidelines

1. Follow the existing code style
2. Write meaningful commit messages
3. Test your changes thoroughly
4. Update documentation as needed
5. Ensure all API endpoints include company_id checks

---

## Known Issues & Limitations

- Build configuration ignores TypeScript errors for faster development
- Images are unoptimized in the current configuration
- Database credentials are currently in source code (should be environment variables)
- Email functionality requires SMTP configuration

---

## Roadmap

Future enhancements planned for this project:

- [ ] Multi-language support (i18n)
- [ ] Mobile native apps (React Native)
- [ ] Advanced analytics dashboard
- [ ] Automated rent collection integration
- [ ] Tenant portal for self-service
- [ ] SMS notifications
- [ ] WhatsApp integration
- [ ] Maintenance request tracking
- [ ] Lease renewal automation
- [ ] Credit check integration

---

## Support

For questions, issues, or feature requests:

- Open an issue on [GitHub](https://github.com/siyanda-zama/rental-billing-dashboard/issues)
- Contact: [Siyanda Zama](https://github.com/siyanda-zama)

---

## Acknowledgments

This project was built using excellent open-source tools and libraries. Special thanks to:

- The Next.js team at Vercel
- The shadcn/ui component library
- The TanStack Query team
- The PHP and React communities

---

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

**Built with care by [Siyanda Zama](https://github.com/siyanda-zama)**

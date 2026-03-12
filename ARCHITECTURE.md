# System Architecture

This document provides a comprehensive overview of the Rental Billing Dashboard's architecture, design decisions, and technical implementation details.

**Author:** [Siyanda Zama](https://github.com/siyanda-zama)

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Design](#database-design)
- [Security Architecture](#security-architecture)
- [Design Decisions](#design-decisions)
- [Scalability Considerations](#scalability-considerations)

---

## Architecture Overview

The Rental Billing Dashboard follows a **client-server architecture** with a clear separation between the presentation layer (Next.js frontend) and the business logic layer (PHP backend API).

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Browser (Chrome, Safari, Firefox, etc.)      │  │
│  │  - Renders UI                                         │  │
│  │  - Handles user interactions                          │  │
│  │  - Manages client-side state                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          │ HTTPS/HTTP
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                   PRESENTATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Next.js Application (Port 3000)            │  │
│  │  - Static Site Generation (SSG)                       │  │
│  │  - React Components                                   │  │
│  │  - Client-side Routing                                │  │
│  │  - State Management (TanStack Query)                  │  │
│  │  - UI Components (shadcn/ui)                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          │ REST API (JSON)
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            PHP Backend API (Port 8000)               │  │
│  │  - RESTful Controllers                                │  │
│  │  - Business Logic                                     │  │
│  │  - JWT Authentication                                 │  │
│  │  - Input Validation                                   │  │
│  │  - PDF Generation                                     │  │
│  │  - Email Services                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          │ PDO (Prepared Statements)
                          │
┌─────────────────────────▼──────────────────────────────────┐
│                      DATA LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                MySQL/MariaDB Database                │  │
│  │  - Relational Data Storage                            │  │
│  │  - Stored Procedures                                  │  │
│  │  - Triggers                                            │  │
│  │  - Views                                               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.2.4 | React framework with App Router and static export |
| **React** | 19 | UI library for building component-based interfaces |
| **TypeScript** | 5.x | Type-safe JavaScript for improved developer experience |
| **Tailwind CSS** | 3.4.17 | Utility-first CSS framework for rapid UI development |
| **shadcn/ui** | Latest | High-quality, accessible React components |
| **TanStack Query** | 5.83.0 | Async state management and caching |
| **React Hook Form** | 7.54.1 | Performant form validation with minimal re-renders |
| **Zod** | 3.24.1 | TypeScript-first schema validation |
| **Recharts** | Latest | Composable charting library for data visualization |
| **jsPDF** | 3.0.3 | Client-side PDF generation |
| **Lucide React** | 0.454.0 | Icon library with 1000+ icons |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **PHP** | 7.4+ | Server-side scripting language |
| **PDO MySQL** | Built-in | Database abstraction layer with prepared statements |
| **Firebase PHP-JWT** | Latest | JWT token generation and validation |
| **Composer** | Latest | PHP dependency management |
| **MySQL** | 5.7+ | Relational database management system |

---

## System Components

### 1. Frontend Application (Next.js)

**Location:** `app/`, `components/`, `lib/`, `hooks/`

**Responsibilities:**
- Render user interface
- Handle client-side routing
- Manage form state and validation
- Communicate with backend API via HTTP
- Cache server responses for performance
- Generate PDF documents client-side
- Provide real-time feedback to users

**Key Features:**
- **Static Export**: Configured for `output: 'export'`, generating static HTML/CSS/JS
- **App Router**: Uses Next.js App Router for file-based routing
- **Client Components**: All routes are client components (`"use client"`)
- **No SSR**: No server-side rendering or server components
- **Responsive Design**: Mobile-first, works on all screen sizes

### 2. Backend API (PHP)

**Location:** `app/api/`

**Responsibilities:**
- Process business logic
- Validate and sanitize input
- Authenticate and authorize users
- Query and manipulate database
- Generate server-side PDFs
- Send emails
- Return JSON responses

**Key Features:**
- **RESTful Design**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **MVC Pattern**: Controllers handle requests, models interact with database
- **JWT Authentication**: Stateless authentication for scalability
- **Prepared Statements**: SQL injection prevention
- **CORS Support**: Cross-origin requests from frontend
- **Error Handling**: Consistent error responses

### 3. Database (MySQL)

**Location:** Database server (local or remote)

**Responsibilities:**
- Persist application data
- Enforce data integrity
- Execute complex queries
- Maintain relationships between entities
- Provide ACID transactions

**Key Features:**
- **Normalized Schema**: Reduces data redundancy
- **Foreign Keys**: Maintain referential integrity
- **Stored Procedures**: Encapsulate complex business logic
- **Triggers**: Automate data updates
- **Indexes**: Optimize query performance

---

## Data Flow

### Request-Response Cycle

```
┌─────────┐                ┌─────────┐                ┌─────────┐
│         │                │         │                │         │
│ Browser │                │ Next.js │                │ PHP API │
│         │                │         │                │         │
└────┬────┘                └────┬────┘                └────┬────┘
     │                          │                          │
     │ 1. User Action           │                          │
     │────────────────────────> │                          │
     │                          │                          │
     │                          │ 2. API Request (JSON)    │
     │                          │─────────────────────────>│
     │                          │                          │
     │                          │                    ┌─────▼─────┐
     │                          │                    │           │
     │                          │                    │  Validate │
     │                          │                    │   Input   │
     │                          │                    │           │
     │                          │                    └─────┬─────┘
     │                          │                          │
     │                          │                    ┌─────▼─────┐
     │                          │                    │           │
     │                          │                    │ Execute   │
     │                          │                    │ Business  │
     │                          │                    │ Logic     │
     │                          │                    │           │
     │                          │                    └─────┬─────┘
     │                          │                          │
     │                          │                    ┌─────▼─────┐
     │                          │                    │           │
     │                          │                    │ Database  │
     │                          │                    │ Query     │
     │                          │                    │           │
     │                          │                    └─────┬─────┘
     │                          │                          │
     │                          │ 3. API Response (JSON)   │
     │                          │<─────────────────────────│
     │                          │                          │
     │                    ┌─────▼─────┐                    │
     │                    │           │                    │
     │                    │  Cache    │                    │
     │                    │  Response │                    │
     │                    │           │                    │
     │                    └─────┬─────┘                    │
     │                          │                          │
     │ 4. Update UI             │                          │
     │<─────────────────────────│                          │
     │                          │                          │
```

### Example: Creating an Invoice

1. **User Action**: User fills out invoice form and clicks "Create Invoice"
2. **Form Validation**: React Hook Form validates input using Zod schema
3. **API Request**: Frontend sends POST request to `/api/invoices` with JSON payload
4. **Authentication**: PHP API validates JWT token from Authorization header
5. **Authorization**: API checks if user has permission for the company_id
6. **Input Validation**: PHP validates and sanitizes request data
7. **Business Logic**: API calculates totals, applies tax, generates invoice number
8. **Database Insert**: PDO executes prepared statement to insert invoice and line items
9. **Response**: API returns JSON response with created invoice data
10. **Cache Update**: TanStack Query updates cached invoices list
11. **UI Update**: React component re-renders with new invoice
12. **Notification**: Toast notification shows success message

---

## Frontend Architecture

### Directory Structure

```
app/
├── (dashboard)/           # Route group for authenticated pages
│   ├── layout.tsx         # Dashboard layout with sidebar, React Query provider
│   ├── dashboard/         # Main dashboard
│   ├── properties/        # Property management
│   ├── tenants/           # Tenant management
│   ├── income/            # Invoices, payments, quotes
│   ├── expenses/          # Expense tracking
│   ├── transactions/      # Financial transactions
│   ├── reports/           # Reporting
│   ├── prepaid/           # Utilities
│   ├── stock/             # Inventory
│   ├── documents/         # Document management
│   └── calendar/          # Calendar
├── api/                   # PHP backend (not Next.js API routes)
└── layout.tsx             # Root layout

components/
├── ui/                    # shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ...
└── app-sidebar.tsx        # Navigation sidebar

lib/
├── api-config.ts          # API URL configuration helper
└── utils.ts               # Utility functions (cn, etc.)

hooks/
└── use-toast.ts           # Toast notification hook
```

### State Management Strategy

#### Server State (TanStack Query)

Used for data fetched from the API:

```typescript
// Example: Fetching tenants
const { data: tenants, isLoading } = useQuery({
  queryKey: ['tenants', companyId],
  queryFn: async () => {
    const response = await fetch(
      getApiUrl(`tenants?company_id=${companyId}`)
    );
    return response.json();
  },
});
```

**Benefits:**
- Automatic caching
- Background refetching
- Optimistic updates
- Request deduplication

#### Client State (React Hooks)

Used for UI state (modals, forms, local selections):

```typescript
// Example: Modal state
const [isOpen, setIsOpen] = useState(false);
```

#### Persistent State (localStorage)

Used for user preferences:

```typescript
// Example: Selected company
localStorage.setItem('selectedCompanyId', companyId);
```

### Routing Architecture

Next.js App Router with file-based routing:

```
URL: /dashboard
├── File: app/(dashboard)/dashboard/page.tsx

URL: /properties/add
├── File: app/(dashboard)/properties/add/page.tsx

URL: /income/invoices/new
├── File: app/(dashboard)/income/invoices/new/page.tsx
```

**Navigation:** Uses `next/link` and `useRouter` for client-side navigation.

### Component Design Patterns

#### 1. Page Components
- Fetch data using TanStack Query
- Handle loading and error states
- Compose smaller UI components

#### 2. UI Components (shadcn/ui)
- Presentational, reusable
- Accept props for customization
- Built on Radix UI primitives

#### 3. Form Components
- Use React Hook Form for state management
- Zod for validation schemas
- Controlled inputs with proper error handling

---

## Backend Architecture

### Directory Structure

```
app/api/
├── index.php                    # Entry point, routing
├── config.php                   # Database connection class
├── AuthController.php           # Authentication
├── PropertyController.php       # Properties CRUD
├── TenantController.php         # Tenants CRUD
├── InvoiceController.php        # Invoices CRUD
├── TransactionController.php    # Transactions CRUD
├── DashboardController.php      # Dashboard stats
├── StockController.php          # Inventory management
├── UtilitiesController.php      # Prepaid utilities
├── CalendarController.php       # Calendar events
├── DocumentController.php       # Document uploads
├── CompanyController.php        # Multi-company support
├── CategoryController.php       # Expense categories
├── LeaseController.php          # Lease management
├── OpeningBalanceController.php # Opening balances
├── UnitController.php           # Property units
├── UserController.php           # User management
├── PDFInvoiceGenerator.php      # Server-side PDF generation
├── PDFReceiptGenerator.php      # Receipt PDF generation
├── EmailService.php             # Email sending
└── vendor/                      # Composer dependencies
    └── firebase/php-jwt/        # JWT library
```

### Request Routing

**Entry Point:** `app/api/index.php`

```php
// Example routing logic
$requestMethod = $_SERVER["REQUEST_METHOD"];
$requestUri = $_SERVER['REQUEST_URI'];

// Parse route
if (strpos($requestUri, '/tenants') !== false) {
    require_once 'TenantController.php';
    $controller = new TenantController($db);

    switch ($requestMethod) {
        case 'GET':
            $controller->index();
            break;
        case 'POST':
            $controller->create();
            break;
        case 'PUT':
            $controller->update();
            break;
        case 'DELETE':
            $controller->delete();
            break;
    }
}
```

### Controller Pattern

Each controller follows a similar structure:

```php
class TenantController {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    // GET /tenants
    public function index() {
        // 1. Get company_id from query params
        // 2. Validate authentication
        // 3. Execute database query
        // 4. Return JSON response
    }

    // POST /tenants
    public function create() {
        // 1. Get request body
        // 2. Validate input
        // 3. Insert into database
        // 4. Return created resource
    }

    // PUT /tenants/:id
    public function update() {
        // Similar pattern
    }

    // DELETE /tenants/:id
    public function delete() {
        // Similar pattern
    }
}
```

### Authentication Flow

```
┌─────────┐          ┌─────────┐          ┌──────────┐
│         │          │         │          │          │
│ Client  │          │   API   │          │ Database │
│         │          │         │          │          │
└────┬────┘          └────┬────┘          └────┬─────┘
     │                    │                     │
     │ POST /auth/login   │                     │
     │ {email, password}  │                     │
     │───────────────────>│                     │
     │                    │                     │
     │                    │ SELECT * FROM users │
     │                    │ WHERE email = ?     │
     │                    │────────────────────>│
     │                    │                     │
     │                    │ User data           │
     │                    │<────────────────────│
     │                    │                     │
     │                    │ Verify password     │
     │                    │ (password_verify)   │
     │                    │                     │
     │                    │ Generate JWT        │
     │                    │ (Firebase JWT)      │
     │                    │                     │
     │ {token, user}      │                     │
     │<───────────────────│                     │
     │                    │                     │
     │ Store token in     │                     │
     │ localStorage       │                     │
     │                    │                     │
     │ Subsequent requests│                     │
     │ Authorization:     │                     │
     │ Bearer {token}     │                     │
     │───────────────────>│                     │
     │                    │                     │
     │                    │ Validate JWT        │
     │                    │ (decode token)      │
     │                    │                     │
```

### Database Access Layer

All database queries use PDO with prepared statements:

```php
// Secure query example
$stmt = $this->conn->prepare("
    SELECT * FROM tenants
    WHERE company_id = :company_id AND id = :id
");

$stmt->bindParam(':company_id', $company_id);
$stmt->bindParam(':id', $tenant_id);
$stmt->execute();

$tenant = $stmt->fetch(PDO::FETCH_ASSOC);
```

**Security Features:**
- Prepared statements prevent SQL injection
- Input validation and sanitization
- Parameter binding for all user input

---

## Database Design

### Entity-Relationship Diagram

```
┌─────────────┐
│  companies  │
└──────┬──────┘
       │
       │ 1:N
       │
   ┌───▼────────────────┬────────────────┬──────────────┐
   │                    │                │              │
┌──▼────────┐  ┌────────▼───┐  ┌────────▼────┐  ┌─────▼─────┐
│properties │  │  tenants   │  │ categories  │  │   users   │
└──┬────────┘  └──┬─────────┘  └─────────────┘  └───────────┘
   │              │
   │ 1:N          │ 1:N
   │              │
┌──▼────┐    ┌───▼────────┐
│ units │    │  invoices  │
└───────┘    └──┬─────────┘
                │
                │ 1:N
                │
         ┌──────▼────────┐
         │invoice_items  │
         └───────────────┘
```

### Key Tables

#### companies
Multi-tenancy support for managing multiple businesses.

```sql
CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### properties
Physical properties managed by the system.

```sql
CREATE TABLE properties (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    type VARCHAR(100),
    units_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);
```

#### tenants
Individuals or entities renting properties.

```sql
CREATE TABLE tenants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    unit_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    id_number VARCHAR(50),
    lease_start DATE,
    lease_end DATE,
    monthly_rent DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (unit_id) REFERENCES units(id)
);
```

#### invoices
Billing documents for tenants.

```sql
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    tenant_id INT NOT NULL,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('draft', 'sent', 'paid', 'overdue') DEFAULT 'draft',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_frequency ENUM('monthly', 'quarterly', 'annually'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

#### transactions
Financial transactions (payments, deposits, expenses).

```sql
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    tenant_id INT,
    type ENUM('income', 'expense', 'deposit', 'transfer') NOT NULL,
    category_id INT,
    amount DECIMAL(10,2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### Database Indexes

Performance optimization through strategic indexing:

```sql
-- Optimize company-based queries
CREATE INDEX idx_tenants_company ON tenants(company_id);
CREATE INDEX idx_properties_company ON properties(company_id);
CREATE INDEX idx_invoices_company ON invoices(company_id);

-- Optimize date range queries
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- Optimize lookups
CREATE INDEX idx_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_tenants_status ON tenants(status);
```

---

## Security Architecture

### Authentication & Authorization

**JWT-Based Authentication:**
1. User logs in with email and password
2. Server verifies credentials against database
3. Server generates JWT token with user claims
4. Client stores token in localStorage
5. Client includes token in Authorization header for subsequent requests
6. Server validates token for each protected endpoint

**Token Structure:**
```json
{
  "user_id": 123,
  "email": "user@example.com",
  "company_id": 1,
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Data Security

**SQL Injection Prevention:**
- All queries use PDO prepared statements
- Parameter binding for user input
- No string concatenation in SQL

**XSS Prevention:**
- Input sanitization on backend
- React's built-in XSS protection
- Content Security Policy headers (recommended)

**CSRF Protection:**
- JWT tokens (stateless, no cookies)
- SameSite cookie attributes (if using sessions)

**Data Validation:**
- Backend validation for all inputs
- Frontend validation with Zod schemas
- Type checking with TypeScript

### Access Control

**Company Isolation:**
Every API request includes `company_id`, ensuring users only access their own data:

```php
// Example access control
$company_id = $_GET['company_id'];
$user_company = $decoded_token->company_id;

if ($company_id != $user_company) {
    http_response_code(403);
    echo json_encode(["message" => "Forbidden"]);
    exit;
}
```

---

## Design Decisions

### Why Next.js Static Export?

**Rationale:**
- **Simple Deployment**: Static files can be hosted anywhere (CDN, S3, Netlify)
- **Performance**: Pre-rendered HTML for fast initial load
- **Cost-Effective**: No server required for frontend
- **Reliability**: Static files have minimal failure points

**Trade-offs:**
- No server-side rendering (SSR)
- No API routes (using separate PHP API instead)
- Client-side data fetching only

### Why Separate PHP Backend?

**Rationale:**
- **Proven Technology**: PHP has 25+ years of maturity for web backends
- **Hosting Availability**: PHP hosting is ubiquitous and affordable
- **Team Expertise**: Developer familiarity with PHP
- **Legacy Integration**: Easy to integrate with existing PHP systems

**Trade-offs:**
- Two servers in development
- CORS configuration required
- Not a monolithic framework

### Why TanStack Query?

**Rationale:**
- **Caching**: Automatic response caching reduces API calls
- **Background Updates**: Keeps data fresh without user interaction
- **Optimistic Updates**: Instant UI feedback
- **Developer Experience**: Declarative data fetching

### Why shadcn/ui?

**Rationale:**
- **Accessibility**: Built on Radix UI primitives (WCAG compliant)
- **Customization**: Copy components into project, full control
- **Quality**: High-quality, battle-tested components
- **No Lock-in**: Components are yours to modify

---

## Scalability Considerations

### Frontend Scalability

**Code Splitting:**
- Next.js automatically splits code by route
- Lazy loading for heavy components

**Asset Optimization:**
- Image optimization (recommended to re-enable)
- CSS purging with Tailwind
- Tree shaking for unused code

**CDN Deployment:**
- Static files served from CDN
- Global edge locations for low latency

### Backend Scalability

**Horizontal Scaling:**
- Stateless API (JWT authentication)
- Multiple PHP servers behind load balancer

**Database Optimization:**
- Indexed queries for fast lookups
- Connection pooling
- Read replicas for heavy read workloads

**Caching Strategy:**
- Redis/Memcached for session storage
- Query result caching
- CDN caching for static assets

### Future Enhancements

**Microservices:**
- Split API into domain-specific services
- Independent scaling of services

**Message Queues:**
- Async processing for emails, PDFs
- Background job processing

**Search Engine:**
- Elasticsearch for full-text search
- Fast tenant/property lookups

---

## Performance Optimizations

### Frontend

- **React Query caching**: Reduces redundant API calls
- **Lazy loading**: Components load on demand
- **Debounced search**: Reduces API calls on user input
- **Optimistic updates**: Instant UI feedback

### Backend

- **Prepared statements**: Reused query plans
- **Indexed columns**: Fast database lookups
- **Stored procedures**: Reduce round-trips
- **Connection reuse**: PDO persistent connections

### Database

- **Query optimization**: EXPLAIN for slow queries
- **Denormalization**: Strategic redundancy for performance
- **Partitioning**: Large table management
- **Regular maintenance**: OPTIMIZE TABLE, ANALYZE TABLE

---

## Monitoring & Observability

### Logging

**Frontend:**
- Browser console for development
- Error tracking (recommended: Sentry)

**Backend:**
- PHP error logs (`error_log()`)
- Custom logging in `api.log`
- Request/response logging

**Database:**
- Slow query log
- Error log
- General query log (development only)

### Metrics (Recommended)

- Response times
- Error rates
- User sessions
- Database query performance
- Server resource usage

---

## Deployment Architecture

### Development

```
Developer Machine
├── Next.js Dev Server (localhost:3000)
├── PHP Built-in Server (localhost:8000)
└── Local MySQL Database
```

### Production

```
┌──────────────────┐
│   CDN / Static   │ ← Frontend static files
│   Hosting        │
└────────┬─────────┘
         │
         │ API Calls
         │
┌────────▼─────────┐
│   PHP Hosting    │ ← Backend API
│   (Apache/Nginx) │
└────────┬─────────┘
         │
         │ Database Connection
         │
┌────────▼─────────┐
│  MySQL Server    │ ← Database
└──────────────────┘
```

---

## Conclusion

The Rental Billing Dashboard architecture prioritizes:

1. **Simplicity**: Easy to understand and maintain
2. **Reliability**: Battle-tested technologies
3. **Scalability**: Can grow with business needs
4. **Security**: Multiple layers of protection
5. **Developer Experience**: Modern tooling and patterns

This architecture provides a solid foundation for a production-ready property management system.

---

**Designed and developed by [Siyanda Zama](https://github.com/siyanda-zama)**

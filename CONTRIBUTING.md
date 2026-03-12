# Contributing to Rental Billing Dashboard

Thank you for your interest in contributing to the Rental Billing Dashboard! This document provides guidelines and instructions for contributing to the project.

**Project Maintainer:** [Siyanda Zama](https://github.com/siyanda-zama)

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, background, or identity.

### Expected Behavior

- Be respectful and considerate in communication
- Provide constructive feedback
- Accept constructive criticism gracefully
- Focus on what's best for the project and community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling, insulting, or derogatory remarks
- Publishing others' private information
- Any conduct that would be inappropriate in a professional setting

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Node.js** (v18+) and **npm** installed
2. **PHP** (v7.4+) installed
3. **MySQL/MariaDB** installed and running
4. **Git** installed
5. A GitHub account
6. Basic knowledge of:
   - React and Next.js
   - TypeScript
   - PHP
   - MySQL/SQL
   - REST APIs

### Finding Ways to Contribute

1. **Browse Open Issues**: Check the [Issues](https://github.com/siyanda-zama/rental-billing-dashboard/issues) page
2. **Look for "Good First Issue" Labels**: Great for newcomers
3. **Check "Help Wanted" Labels**: Areas where contributions are especially welcome
4. **Improve Documentation**: Always appreciated
5. **Report Bugs**: Help identify issues
6. **Suggest Features**: Share your ideas

---

## Development Setup

### 1. Fork the Repository

Click the "Fork" button on the [GitHub repository](https://github.com/siyanda-zama/rental-billing-dashboard).

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/rental-billing-dashboard.git
cd rental-billing-dashboard
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/siyanda-zama/rental-billing-dashboard.git
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Set Up Database

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE rental_billing;"

# Import schema
mysql -u root -p rental_billing < database-setup.sql
```

### 6. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your local configuration.

### 7. Update Database Credentials

Edit `app/api/config.php` with your local MySQL credentials:

```php
private $host = "localhost";
private $db_name = "rental_billing";
private $username = "your_username";
private $password = "your_password";
```

### 8. Start Development Servers

**Terminal 1:**
```bash
npm run api
```

**Terminal 2:**
```bash
npm run dev
```

### 9. Verify Setup

Navigate to `http://localhost:3000` and ensure the application loads correctly.

---

## Project Structure

Understanding the project structure helps you navigate and contribute effectively:

```
rental-billing-dashboard/
├── app/
│   ├── (dashboard)/          # Next.js pages (authenticated routes)
│   └── api/                  # PHP backend API
├── components/
│   ├── ui/                   # Reusable UI components (shadcn/ui)
│   └── app-sidebar.tsx       # Main navigation
├── lib/                      # Utility functions
├── hooks/                    # Custom React hooks
├── public/                   # Static assets
├── styles/                   # Global styles
└── docs/                     # Documentation
```

### Key Files

- **`next.config.mjs`**: Next.js configuration
- **`tailwind.config.ts`**: Tailwind CSS configuration
- **`tsconfig.json`**: TypeScript configuration
- **`app/api/index.php`**: API routing entry point
- **`app/api/config.php`**: Database configuration
- **`CLAUDE.md`**: Project instructions for AI-assisted development

---

## Coding Standards

### TypeScript/React (Frontend)

#### Code Style

- Use **TypeScript** for type safety
- Follow **ESLint** rules (run `npm run lint`)
- Use **Prettier** for formatting (if configured)
- Use functional components with hooks
- Prefer named exports over default exports

#### Naming Conventions

```typescript
// Components: PascalCase
export function PropertyCard({ property }: PropertyCardProps) {}

// Functions: camelCase
function calculateTotalRent(properties: Property[]) {}

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = "http://localhost:8000";

// Types/Interfaces: PascalCase
interface TenantData {
  id: number;
  name: string;
}
```

#### File Naming

- Components: `PascalCase.tsx` (e.g., `PropertyList.tsx`)
- Utilities: `kebab-case.ts` (e.g., `api-config.ts`)
- Pages: `page.tsx` (Next.js convention)
- Hooks: `use-*.ts` (e.g., `use-tenants.ts`)

#### Component Structure

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// 1. Type definitions
interface PropertyCardProps {
  property: Property;
  onEdit?: (id: number) => void;
}

// 2. Component
export function PropertyCard({ property, onEdit }: PropertyCardProps) {
  // 3. State and hooks
  const [isExpanded, setIsExpanded] = useState(false);

  // 4. Event handlers
  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  // 5. Render
  return (
    <div onClick={handleClick}>
      {/* Component JSX */}
    </div>
  );
}
```

#### React Best Practices

- Use `"use client"` directive for client components
- Keep components small and focused (Single Responsibility Principle)
- Extract reusable logic into custom hooks
- Use TanStack Query for server state
- Avoid prop drilling (use context or state management)
- Memoize expensive computations with `useMemo`
- Memoize callback functions with `useCallback`

### PHP (Backend)

#### Code Style

- Follow **PSR-12** coding standard
- Use **4 spaces** for indentation (not tabs)
- Use **camelCase** for method names
- Use **PascalCase** for class names
- Add PHPDoc comments for functions and classes

#### File Naming

- Controllers: `PascalCaseController.php` (e.g., `TenantController.php`)
- One class per file
- Filename matches class name

#### Controller Structure

```php
<?php

/**
 * TenantController
 *
 * Handles tenant-related operations
 */
class TenantController {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Get all tenants for a company
     *
     * @return void Outputs JSON response
     */
    public function index() {
        // Validate company_id
        $company_id = $_GET['company_id'] ?? null;

        if (!$company_id) {
            http_response_code(400);
            echo json_encode(["message" => "company_id is required"]);
            return;
        }

        // Query database
        $stmt = $this->conn->prepare("
            SELECT * FROM tenants WHERE company_id = :company_id
        ");
        $stmt->bindParam(':company_id', $company_id);
        $stmt->execute();

        // Return response
        $tenants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode([
            "success" => true,
            "data" => $tenants
        ]);
    }
}
```

#### Database Best Practices

- **Always use prepared statements** (never concatenate SQL)
- **Validate all inputs** before using them
- **Use transactions** for multi-step operations
- **Handle errors gracefully** with try-catch
- **Return consistent JSON responses**

```php
// Good: Prepared statement
$stmt = $this->conn->prepare("SELECT * FROM tenants WHERE id = :id");
$stmt->bindParam(':id', $tenant_id);
$stmt->execute();

// Bad: SQL injection risk
$stmt = $this->conn->query("SELECT * FROM tenants WHERE id = $tenant_id");
```

### SQL/Database

#### Naming Conventions

- Tables: `snake_case`, plural (e.g., `tenants`, `invoice_items`)
- Columns: `snake_case` (e.g., `first_name`, `created_at`)
- Primary keys: `id`
- Foreign keys: `{table}_id` (e.g., `tenant_id`, `property_id`)

#### Best Practices

- Add indexes for frequently queried columns
- Use appropriate data types (e.g., `DECIMAL` for money)
- Include `created_at` and `updated_at` timestamps
- Use foreign key constraints for referential integrity
- Document complex queries with comments

---

## Making Changes

### Branching Strategy

We use **feature branch workflow**:

1. **Create a Branch** from `main`:
   ```bash
   git checkout -b feature/add-tenant-search
   ```

2. **Branch Naming**:
   - Features: `feature/description`
   - Bug fixes: `fix/description`
   - Documentation: `docs/description`
   - Refactoring: `refactor/description`

### Development Workflow

1. **Sync with Upstream**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**:
   - Write clean, readable code
   - Follow coding standards
   - Add comments for complex logic
   - Keep commits focused and atomic

4. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Add tenant search functionality"
   ```

### Commit Messages

Write clear, descriptive commit messages:

**Format:**
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat: Add tenant search functionality

Implement search by name, email, and unit number.
Includes debounced input for better performance.

Closes #42
```

```
fix: Correct invoice total calculation

Tax was not being included in total amount.
Now correctly adds tax to subtotal.

Fixes #53
```

### Code Review Checklist

Before submitting, verify:

- [ ] Code follows project coding standards
- [ ] No console.log statements (unless intentional)
- [ ] No commented-out code
- [ ] All new functions have TypeScript types
- [ ] All database queries use prepared statements
- [ ] Error handling is implemented
- [ ] Code is well-documented
- [ ] No hardcoded values (use constants or env variables)
- [ ] Responsive design works on mobile
- [ ] No breaking changes (or documented if necessary)

---

## Testing

### Manual Testing

1. **Test your changes thoroughly**:
   - Test happy paths (expected behavior)
   - Test edge cases
   - Test error handling
   - Test on different screen sizes

2. **Test both frontend and backend**:
   - Verify API responses in browser DevTools
   - Check database for correct data
   - Ensure no console errors

3. **Cross-browser testing** (if UI changes):
   - Chrome
   - Firefox
   - Safari (if on Mac)

### Testing Checklist

- [ ] Feature works as intended
- [ ] No errors in browser console
- [ ] No errors in PHP error log
- [ ] API returns correct data
- [ ] Database is updated correctly
- [ ] UI is responsive (mobile, tablet, desktop)
- [ ] Forms validate correctly
- [ ] Error messages display properly

---

## Submitting Changes

### Pull Request Process

1. **Push to Your Fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**:
   - Go to your fork on GitHub
   - Click "Compare & pull request"
   - Fill out the PR template

3. **PR Title Format**:
   ```
   [Type] Brief description
   ```
   Examples:
   - `[Feature] Add tenant search`
   - `[Fix] Correct invoice calculation`
   - `[Docs] Update API documentation`

4. **PR Description Template**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Refactoring

   ## Changes Made
   - Added tenant search component
   - Implemented search API endpoint
   - Updated tenant list page

   ## Testing
   - [ ] Tested locally
   - [ ] No console errors
   - [ ] API works correctly
   - [ ] Responsive design verified

   ## Screenshots (if applicable)
   [Add screenshots here]

   ## Related Issues
   Closes #42
   ```

5. **Wait for Review**:
   - Address reviewer feedback
   - Make requested changes
   - Push updates to the same branch

6. **Merge**:
   - Once approved, your PR will be merged
   - Delete your feature branch after merge

---

## Reporting Bugs

### Before Reporting

1. **Check existing issues**: The bug may already be reported
2. **Try latest version**: Update to the latest code
3. **Verify it's a bug**: Not a configuration issue

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Screenshots
If applicable, add screenshots

## Environment
- OS: [e.g., macOS 12.0, Windows 11]
- Browser: [e.g., Chrome 120, Firefox 115]
- Node.js version: [e.g., 18.17.0]
- PHP version: [e.g., 8.2.0]

## Additional Context
Any other relevant information
```

---

## Feature Requests

We welcome feature suggestions! When requesting a feature:

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Problem Statement
What problem does this solve?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Mockups, examples, or references
```

---

## Documentation

### When to Update Documentation

Update documentation when you:

- Add a new feature
- Change existing functionality
- Add new API endpoints
- Modify configuration options
- Fix bugs that affect documentation

### Documentation Files

- **README.md**: Project overview, quick start
- **INSTALLATION.md**: Setup instructions
- **ARCHITECTURE.md**: System design
- **API_DOCUMENTATION.md**: API endpoints
- **CLAUDE.md**: Project instructions for AI tools
- **CONTRIBUTING.md**: This file

### Documentation Style

- Use clear, concise language
- Include code examples
- Add screenshots for UI changes
- Keep it up-to-date
- Use proper markdown formatting

---

## Questions?

If you have questions:

1. Check the documentation first
2. Search existing issues
3. Ask in a new issue with "Question" label
4. Contact [Siyanda Zama](https://github.com/siyanda-zama)

---

## Recognition

All contributors will be recognized in the project. Thank you for making this project better!

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank you for contributing to Rental Billing Dashboard!**

**Project maintained by [Siyanda Zama](https://github.com/siyanda-zama)**

# API Documentation

Complete reference for the Rental Billing Dashboard REST API.

**API Version:** 1.0
**Base URL:** `http://localhost:8000` (development) or your production API URL
**Author:** [Siyanda Zama](https://github.com/siyanda-zama)

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Common Parameters](#common-parameters)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Authentication](#authentication-endpoints)
  - [Dashboard](#dashboard-endpoints)
  - [Properties](#properties-endpoints)
  - [Tenants](#tenants-endpoints)
  - [Invoices](#invoices-endpoints)
  - [Transactions](#transactions-endpoints)
  - [Stock/Inventory](#stock-endpoints)
  - [Utilities](#utilities-endpoints)
  - [Documents](#documents-endpoints)
  - [Calendar](#calendar-endpoints)
  - [Companies](#companies-endpoints)
  - [Categories](#categories-endpoints)
  - [Users](#users-endpoints)

---

## Overview

The Rental Billing Dashboard API is a RESTful web service that provides programmatic access to property management data. All responses are returned in JSON format.

### API Characteristics

- **Protocol:** HTTP/HTTPS
- **Data Format:** JSON
- **Authentication:** JWT (JSON Web Tokens)
- **CORS:** Enabled for configured origins
- **Character Encoding:** UTF-8

### HTTP Methods

| Method | Description |
|--------|-------------|
| `GET` | Retrieve resources |
| `POST` | Create new resources |
| `PUT` | Update existing resources |
| `DELETE` | Delete resources |
| `OPTIONS` | CORS preflight requests |

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Tokens must be included in the `Authorization` header for all protected endpoints.

### Login

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "company_id": 1
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Using the Token

Include the JWT token in the `Authorization` header for all authenticated requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Logout

**Endpoint:** `POST /auth/logout`

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Common Parameters

### Query Parameters

Most endpoints accept these common query parameters:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `company_id` | integer | Filter by company (required for most endpoints) | `?company_id=1` |
| `page` | integer | Page number for pagination | `?page=2` |
| `limit` | integer | Results per page | `?limit=50` |
| `sort` | string | Sort field | `?sort=created_at` |
| `order` | string | Sort direction (`asc` or `desc`) | `?order=desc` |

### Example Usage

```
GET /tenants?company_id=1&page=1&limit=20&sort=name&order=asc
```

---

## Error Handling

The API uses conventional HTTP response codes to indicate success or failure.

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | OK - Request successful |
| `201` | Created - Resource created successfully |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Authentication required or failed |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `422` | Unprocessable Entity - Validation error |
| `500` | Internal Server Error - Server error |

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field_name": ["Validation error message"]
  }
}
```

### Example Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Email is required"],
    "phone": ["Phone number must be 10 digits"]
  }
}
```

---

## Rate Limiting

Currently, rate limiting is not enforced. For production deployments, consider implementing rate limiting to prevent abuse.

**Recommended limits:**
- 100 requests per minute per IP
- 1000 requests per hour per user

---

## API Endpoints

---

## Authentication Endpoints

### POST /auth/login

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "company_id": 1
  }
}
```

### POST /auth/logout

Logout current user.

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secure_password",
  "company_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user_id": 2
}
```

---

## Dashboard Endpoints

### GET /dashboard/stats

Get dashboard statistics and key metrics.

**Query Parameters:**
- `company_id` (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_properties": 15,
    "total_units": 48,
    "occupied_units": 42,
    "vacant_units": 6,
    "total_tenants": 42,
    "active_tenants": 40,
    "inactive_tenants": 2,
    "monthly_revenue": 125000.00,
    "outstanding_invoices": 15,
    "outstanding_amount": 45000.00,
    "recent_payments": [
      {
        "id": 1,
        "tenant_name": "John Smith",
        "amount": 5000.00,
        "date": "2024-02-15"
      }
    ]
  }
}
```

---

## Properties Endpoints

### GET /properties

Get all properties for a company.

**Query Parameters:**
- `company_id` (required)
- `status` (optional): `active`, `inactive`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "name": "Sunrise Apartments",
      "address": "123 Main Street, Cape Town",
      "type": "Residential",
      "units_count": 12,
      "occupied_units": 10,
      "monthly_revenue": 60000.00,
      "created_at": "2024-01-15 10:30:00"
    }
  ]
}
```

### GET /properties/:id

Get a specific property by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "company_id": 1,
    "name": "Sunrise Apartments",
    "address": "123 Main Street, Cape Town",
    "type": "Residential",
    "description": "Modern apartment complex",
    "units_count": 12,
    "units": [
      {
        "id": 1,
        "unit_number": "A101",
        "bedrooms": 2,
        "bathrooms": 1,
        "monthly_rent": 5000.00,
        "status": "occupied"
      }
    ]
  }
}
```

### POST /properties

Create a new property.

**Request:**
```json
{
  "company_id": 1,
  "name": "Ocean View Apartments",
  "address": "456 Beach Road, Durban",
  "type": "Residential",
  "description": "Luxury beachfront apartments"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Property created successfully",
  "data": {
    "id": 2,
    "company_id": 1,
    "name": "Ocean View Apartments"
  }
}
```

### PUT /properties/:id

Update an existing property.

**Request:**
```json
{
  "name": "Ocean View Luxury Apartments",
  "address": "456 Beach Road, Durban",
  "type": "Residential"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Property updated successfully"
}
```

### DELETE /properties/:id

Delete a property.

**Response:**
```json
{
  "success": true,
  "message": "Property deleted successfully"
}
```

---

## Tenants Endpoints

### GET /tenants

Get all tenants for a company.

**Query Parameters:**
- `company_id` (required)
- `status` (optional): `active`, `inactive`
- `property_id` (optional): Filter by property
- `unit_id` (optional): Filter by unit

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+27 123 456 789",
      "id_number": "8901015800081",
      "property_name": "Sunrise Apartments",
      "unit_number": "A101",
      "monthly_rent": 5000.00,
      "lease_start": "2024-01-01",
      "lease_end": "2024-12-31",
      "status": "active",
      "balance": -1500.00
    }
  ]
}
```

### GET /tenants/:id

Get a specific tenant by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "company_id": 1,
    "unit_id": 1,
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+27 123 456 789",
    "id_number": "8901015800081",
    "lease_start": "2024-01-01",
    "lease_end": "2024-12-31",
    "monthly_rent": 5000.00,
    "deposit_amount": 5000.00,
    "status": "active",
    "created_at": "2024-01-01 09:00:00",
    "invoices": [...],
    "payments": [...],
    "balance": -1500.00
  }
}
```

### POST /tenants

Create a new tenant.

**Request:**
```json
{
  "company_id": 1,
  "unit_id": 1,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+27 987 654 321",
  "id_number": "9001015800082",
  "lease_start": "2024-03-01",
  "lease_end": "2025-02-28",
  "monthly_rent": 6000.00,
  "deposit_amount": 6000.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant created successfully",
  "data": {
    "id": 2,
    "name": "Jane Doe"
  }
}
```

### PUT /tenants/:id

Update an existing tenant.

**Request:**
```json
{
  "phone": "+27 111 222 333",
  "monthly_rent": 6500.00,
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tenant updated successfully"
}
```

### DELETE /tenants/:id

Delete a tenant (soft delete, sets status to inactive).

**Response:**
```json
{
  "success": true,
  "message": "Tenant deleted successfully"
}
```

### GET /tenants/:id/statement

Get tenant statement with all transactions.

**Query Parameters:**
- `start_date` (optional): Filter from date (YYYY-MM-DD)
- `end_date` (optional): Filter to date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": 1,
      "name": "John Smith",
      "unit_number": "A101"
    },
    "opening_balance": 0.00,
    "transactions": [
      {
        "date": "2024-02-01",
        "type": "invoice",
        "description": "February Rent",
        "debit": 5000.00,
        "credit": 0.00,
        "balance": 5000.00
      },
      {
        "date": "2024-02-05",
        "type": "payment",
        "description": "Payment received",
        "debit": 0.00,
        "credit": 3500.00,
        "balance": 1500.00
      }
    ],
    "closing_balance": 1500.00
  }
}
```

---

## Invoices Endpoints

### GET /invoices

Get all invoices for a company.

**Query Parameters:**
- `company_id` (required)
- `tenant_id` (optional): Filter by tenant
- `status` (optional): `draft`, `sent`, `paid`, `overdue`
- `start_date` (optional): From date
- `end_date` (optional): To date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "tenant_id": 1,
      "tenant_name": "John Smith",
      "invoice_number": "INV-2024-001",
      "invoice_date": "2024-02-01",
      "due_date": "2024-02-07",
      "subtotal": 5000.00,
      "tax_amount": 0.00,
      "total_amount": 5000.00,
      "paid_amount": 3500.00,
      "balance": 1500.00,
      "status": "sent",
      "is_recurring": false
    }
  ]
}
```

### GET /invoices/:id

Get a specific invoice with line items.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "invoice_number": "INV-2024-001",
    "invoice_date": "2024-02-01",
    "due_date": "2024-02-07",
    "tenant": {
      "id": 1,
      "name": "John Smith",
      "email": "john@example.com",
      "unit_number": "A101"
    },
    "items": [
      {
        "id": 1,
        "description": "Monthly Rent - February 2024",
        "quantity": 1,
        "unit_price": 5000.00,
        "amount": 5000.00
      }
    ],
    "subtotal": 5000.00,
    "tax_amount": 0.00,
    "total_amount": 5000.00,
    "paid_amount": 3500.00,
    "balance": 1500.00,
    "status": "sent",
    "notes": "Payment due within 7 days"
  }
}
```

### POST /invoices

Create a new invoice.

**Request:**
```json
{
  "company_id": 1,
  "tenant_id": 1,
  "invoice_date": "2024-03-01",
  "due_date": "2024-03-07",
  "items": [
    {
      "description": "Monthly Rent - March 2024",
      "quantity": 1,
      "unit_price": 5000.00
    },
    {
      "description": "Water",
      "quantity": 1,
      "unit_price": 200.00
    }
  ],
  "tax_rate": 0,
  "notes": "Payment due within 7 days",
  "is_recurring": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice created successfully",
  "data": {
    "id": 2,
    "invoice_number": "INV-2024-002",
    "total_amount": 5200.00
  }
}
```

### PUT /invoices/:id

Update an existing invoice.

**Request:**
```json
{
  "due_date": "2024-03-15",
  "status": "sent",
  "notes": "Extended payment terms"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invoice updated successfully"
}
```

### DELETE /invoices/:id

Delete an invoice.

**Response:**
```json
{
  "success": true,
  "message": "Invoice deleted successfully"
}
```

### POST /invoices/:id/send-email

Send invoice via email to tenant.

**Response:**
```json
{
  "success": true,
  "message": "Invoice sent successfully to john@example.com"
}
```

### GET /invoices/recurring

Get all recurring invoices.

**Query Parameters:**
- `company_id` (required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "tenant_name": "John Smith",
      "description": "Monthly Rent",
      "amount": 5000.00,
      "frequency": "monthly",
      "next_invoice_date": "2024-04-01",
      "is_active": true
    }
  ]
}
```

---

## Transactions Endpoints

### GET /transactions

Get all transactions for a company.

**Query Parameters:**
- `company_id` (required)
- `type` (optional): `income`, `expense`, `deposit`, `transfer`
- `tenant_id` (optional)
- `start_date` (optional)
- `end_date` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "tenant_id": 1,
      "tenant_name": "John Smith",
      "type": "income",
      "category": "Rent Payment",
      "amount": 5000.00,
      "transaction_date": "2024-02-05",
      "description": "February rent payment",
      "reference": "PAY-001",
      "created_at": "2024-02-05 14:30:00"
    }
  ]
}
```

### POST /transactions

Create a new transaction.

**Request:**
```json
{
  "company_id": 1,
  "tenant_id": 1,
  "type": "income",
  "category_id": 1,
  "amount": 5000.00,
  "transaction_date": "2024-02-05",
  "description": "Rent payment",
  "reference": "PAY-002",
  "payment_method": "Bank Transfer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "id": 2,
    "amount": 5000.00
  }
}
```

### GET /transactions/deposits

Get deposit transactions.

**Query Parameters:**
- `company_id` (required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "tenant_name": "John Smith",
      "amount": 5000.00,
      "date": "2024-01-01",
      "status": "held",
      "notes": "Security deposit"
    }
  ]
}
```

### GET /transactions/balance

Get balance sheet summary.

**Query Parameters:**
- `company_id` (required)
- `start_date` (optional)
- `end_date` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_income": 125000.00,
    "total_expenses": 45000.00,
    "net_profit": 80000.00,
    "income_by_category": [...],
    "expenses_by_category": [...]
  }
}
```

---

## Stock Endpoints

### GET /stock

Get all stock items.

**Query Parameters:**
- `company_id` (required)
- `category` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "name": "Light Bulb - LED 9W",
      "category": "Electrical",
      "unit": "piece",
      "quantity_on_hand": 50,
      "unit_cost": 45.00,
      "total_value": 2250.00,
      "reorder_level": 10,
      "supplier_name": "Electrical Supplies Co."
    }
  ]
}
```

### POST /stock

Add new stock item.

**Request:**
```json
{
  "company_id": 1,
  "name": "Paint - White 5L",
  "category": "Maintenance",
  "unit": "can",
  "quantity_on_hand": 20,
  "unit_cost": 150.00,
  "reorder_level": 5,
  "supplier_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock item added successfully",
  "data": {
    "id": 2
  }
}
```

### POST /stock/issue

Issue stock to tenant or property.

**Request:**
```json
{
  "company_id": 1,
  "stock_id": 1,
  "quantity": 2,
  "issued_to_type": "tenant",
  "issued_to_id": 1,
  "date": "2024-02-10",
  "notes": "Replaced broken bulbs in unit A101"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock issued successfully"
}
```

### POST /stock/receive

Receive stock from supplier.

**Request:**
```json
{
  "company_id": 1,
  "stock_id": 1,
  "quantity": 100,
  "unit_cost": 42.00,
  "supplier_id": 1,
  "date": "2024-02-08",
  "reference": "PO-2024-001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock received successfully"
}
```

---

## Utilities Endpoints

### GET /utilities/electricity

Get electricity transactions.

**Query Parameters:**
- `company_id` (required)
- `tenant_id` (optional)
- `start_date` (optional)
- `end_date` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenant_name": "John Smith",
      "unit_number": "A101",
      "amount": 500.00,
      "units": 50,
      "date": "2024-02-10",
      "meter_number": "12345678",
      "token": "1234-5678-9012-3456"
    }
  ]
}
```

### POST /utilities/electricity

Record electricity purchase.

**Request:**
```json
{
  "company_id": 1,
  "tenant_id": 1,
  "amount": 500.00,
  "units": 50,
  "date": "2024-02-10",
  "meter_number": "12345678",
  "token": "1234-5678-9012-3456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Electricity purchase recorded successfully"
}
```

### GET /utilities/water

Get water transactions.

**Query Parameters:**
- `company_id` (required)
- `tenant_id` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenant_name": "John Smith",
      "unit_number": "A101",
      "amount": 200.00,
      "units": 10,
      "date": "2024-02-10"
    }
  ]
}
```

### POST /utilities/water

Record water purchase.

**Request:**
```json
{
  "company_id": 1,
  "tenant_id": 1,
  "amount": 200.00,
  "units": 10,
  "date": "2024-02-10"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Water purchase recorded successfully"
}
```

---

## Documents Endpoints

### GET /documents

Get all documents.

**Query Parameters:**
- `company_id` (required)
- `tenant_id` (optional)
- `type` (optional): `lease`, `id`, `proof_of_residence`, `other`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "tenant_name": "John Smith",
      "file_name": "lease_agreement.pdf",
      "file_type": "lease",
      "file_size": 245678,
      "upload_date": "2024-01-15",
      "url": "/storage/documents/lease_agreement.pdf"
    }
  ]
}
```

### POST /documents

Upload a new document.

**Request:** `multipart/form-data`

**Form Fields:**
- `company_id`: integer
- `tenant_id`: integer
- `file_type`: string
- `file`: file upload

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "id": 2,
    "url": "/storage/documents/id_copy.pdf"
  }
}
```

### DELETE /documents/:id

Delete a document.

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

---

## Calendar Endpoints

### GET /calendar/events

Get calendar events.

**Query Parameters:**
- `company_id` (required)
- `start_date` (optional)
- `end_date` (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Property Inspection - Sunrise Apartments",
      "start": "2024-02-15 10:00:00",
      "end": "2024-02-15 12:00:00",
      "type": "inspection",
      "property_id": 1,
      "tenant_id": null,
      "notes": "Annual property inspection"
    }
  ]
}
```

### POST /calendar/events

Create a new calendar event.

**Request:**
```json
{
  "company_id": 1,
  "title": "Lease Renewal Meeting",
  "start": "2024-03-01 14:00:00",
  "end": "2024-03-01 15:00:00",
  "type": "meeting",
  "tenant_id": 1,
  "notes": "Discuss lease renewal terms"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event created successfully",
  "data": {
    "id": 2
  }
}
```

### PUT /calendar/events/:id

Update a calendar event.

**Request:**
```json
{
  "start": "2024-03-01 15:00:00",
  "end": "2024-03-01 16:00:00"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event updated successfully"
}
```

### DELETE /calendar/events/:id

Delete a calendar event.

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

---

## Companies Endpoints

### GET /companies

Get all companies (admin only).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "ABC Property Management",
      "email": "admin@abc.com",
      "phone": "+27 11 123 4567",
      "address": "123 Business Park, Johannesburg",
      "created_at": "2024-01-01 00:00:00"
    }
  ]
}
```

### GET /companies/:id

Get a specific company.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "ABC Property Management",
    "email": "admin@abc.com",
    "phone": "+27 11 123 4567",
    "address": "123 Business Park, Johannesburg",
    "properties_count": 15,
    "tenants_count": 42,
    "created_at": "2024-01-01 00:00:00"
  }
}
```

### POST /companies

Create a new company.

**Request:**
```json
{
  "name": "XYZ Properties",
  "email": "info@xyz.com",
  "phone": "+27 21 987 6543",
  "address": "456 Corporate Drive, Cape Town"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company created successfully",
  "data": {
    "id": 2
  }
}
```

---

## Categories Endpoints

### GET /categories

Get expense categories.

**Query Parameters:**
- `company_id` (required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Maintenance",
      "type": "expense",
      "color": "#FF5733"
    },
    {
      "id": 2,
      "name": "Rent Payment",
      "type": "income",
      "color": "#33FF57"
    }
  ]
}
```

### POST /categories

Create a new category.

**Request:**
```json
{
  "company_id": 1,
  "name": "Utilities",
  "type": "expense",
  "color": "#3357FF"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": 3
  }
}
```

---

## Users Endpoints

### GET /users

Get all users for a company.

**Query Parameters:**
- `company_id` (required)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Admin",
      "email": "admin@example.com",
      "role": "admin",
      "company_id": 1,
      "created_at": "2024-01-01 00:00:00"
    }
  ]
}
```

### POST /users

Create a new user.

**Request:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "secure_password",
  "role": "user",
  "company_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 2
  }
}
```

---

## Webhooks

Currently, webhooks are not implemented. Future versions may include:

- Invoice created
- Payment received
- Lease expiring soon
- Maintenance request submitted

---

## Changelog

### Version 1.0.0 (2024-02-17)
- Initial API release
- Complete property management endpoints
- Tenant management
- Invoice generation and tracking
- Transaction recording
- Stock/inventory management
- Prepaid utilities
- Calendar integration
- Multi-company support

---

## Support

For API support, questions, or feature requests:

- **GitHub Issues:** [github.com/siyanda-zama/rental-billing-dashboard/issues](https://github.com/siyanda-zama/rental-billing-dashboard/issues)
- **Developer:** [Siyanda Zama](https://github.com/siyanda-zama)

---

**API Documentation maintained by [Siyanda Zama](https://github.com/siyanda-zama)**

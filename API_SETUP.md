# API Setup Guide

This project uses a PHP backend API located in the `app/api` directory. The API must be run separately from the Next.js development server.

## Quick Start

### 1. Start the PHP API Server

In one terminal, run:
```bash
npm run api
```

This will start the PHP built-in server at `http://localhost:8000`

### 2. Start the Next.js Development Server

In another terminal, run:
```bash
npm run dev
```

This will start the Next.js app at `http://localhost:3000`

## Configuration

The API URL is configured via environment variables:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` if needed:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

## Database Configuration

The database credentials are currently in `app/api/config.php`. For production:

1. Move credentials to environment variables
2. Update `config.php` to read from environment variables
3. Never commit database credentials to version control

## API Endpoints

The API is a RESTful API with the following main endpoints:

- `POST /login` - User authentication
- `GET /companies` - List companies
- `GET /dashboard` - Dashboard data
- `GET /properties` - Properties management
- `GET /tenants` - Tenants management
- `GET /invoices` - Invoice management
- `GET /transactions` - Financial transactions
- `GET /stock` - Inventory management
- `GET /utilities` - Prepaid utilities (electricity/water)
- `GET /documents` - Tenant document uploads
- `GET /calendar` - Calendar events

## Production Deployment

For production deployment:

1. Deploy the PHP API to a PHP hosting service or server
2. Update `.env.local` (or set environment variables) with the production API URL:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-domain.com
   ```
3. Build and deploy the Next.js app:
   ```bash
   npm run build
   npm run export
   ```

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
- Make sure both servers are running
- Check that `app/api/config.php` and `app/api/index.php` have the correct CORS headers
- The API is configured to allow `http://localhost:3000` and `http://localhost:8000`

### 404 Errors
If API requests return 404:
- Make sure the PHP server is running on port 8000
- Check that the `.env.local` file exists and has the correct API URL
- Verify the API endpoint exists in `app/api/index.php`

### Database Connection Errors
If you see database connection errors:
- Check the credentials in `app/api/config.php`
- Ensure your MySQL server is running
- Verify the database and tables exist

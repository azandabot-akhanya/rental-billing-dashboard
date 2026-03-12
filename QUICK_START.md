# Quick Start Guide

## First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local

# 3. Verify .env.local has the correct API URL
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Application

### You MUST run TWO servers:

**Terminal 1:**
```bash
npm run api
```
Output: `PHP 8.x Development Server (http://localhost:8000) started`

**Terminal 2:**
```bash
npm run dev
```
Output: `- Local: http://localhost:3000`

### Access the Application
Open your browser to: **http://localhost:3000**

## Common Commands

```bash
npm run api          # Start PHP API server (port 8000)
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Build for production
npm run lint         # Run linter
```

## Troubleshooting

### "API not found" or 404 errors
→ Make sure `npm run api` is running

### CORS errors in browser console
→ Check both servers are running
→ Verify `.env.local` exists

### Database connection errors
→ Check `app/api/config.php` credentials
→ Ensure MySQL server is running

## Next Steps

1. ✅ Both servers running
2. ✅ Can access http://localhost:3000
3. ✅ Can login
4. ✅ Dashboard loads data

For detailed setup instructions, see `API_SETUP.md`

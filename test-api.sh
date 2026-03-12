#!/bin/bash

# API Testing Script
# This script tests all API endpoints to verify they're working

API_URL="http://localhost:8000"
COMPANY_ID=1

echo "================================"
echo "API Testing Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Test 1: API Health Check
echo "1. Testing API health..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/test")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ API is running${NC}"
else
    echo -e "${RED}✗ API health check failed (HTTP $RESPONSE)${NC}"
fi
echo ""

# Test 2: Login
echo "2. Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"password"}')
echo "Response: $LOGIN_RESPONSE"
echo ""

# Test 3: Get Companies
echo "3. Testing companies endpoint..."
COMPANIES=$(curl -s "$API_URL/companies")
echo "Response: $COMPANIES"
echo ""

# Test 4: Get Dashboard
echo "4. Testing dashboard endpoint..."
DASHBOARD=$(curl -s "$API_URL/dashboard?company_id=$COMPANY_ID")
echo "Response: $DASHBOARD"
echo ""

# Test 5: Get Properties
echo "5. Testing properties endpoint..."
PROPERTIES=$(curl -s "$API_URL/properties?company_id=$COMPANY_ID")
echo "Response: $PROPERTIES"
echo ""

# Test 6: Get Tenants
echo "6. Testing tenants endpoint..."
TENANTS=$(curl -s "$API_URL/tenants?company_id=$COMPANY_ID")
echo "Response: $TENANTS"
echo ""

# Test 7: Get Invoices
echo "7. Testing invoices endpoint..."
INVOICES=$(curl -s "$API_URL/invoices?company_id=$COMPANY_ID")
echo "Response: $INVOICES"
echo ""

# Test 8: Get Transactions
echo "8. Testing transactions endpoint..."
TRANSACTIONS=$(curl -s "$API_URL/transactions?company_id=$COMPANY_ID&start_date=2024-01-01&end_date=2024-12-31")
echo "Response: $TRANSACTIONS"
echo ""

# Test 9: Get Categories
echo "9. Testing categories endpoint..."
CATEGORIES=$(curl -s "$API_URL/categories?company_id=$COMPANY_ID")
echo "Response: $CATEGORIES"
echo ""

# Test 10: Get Suppliers
echo "10. Testing suppliers endpoint..."
SUPPLIERS=$(curl -s "$API_URL/suppliers?company_id=$COMPANY_ID")
echo "Response: $SUPPLIERS"
echo ""

echo "================================"
echo "Testing Complete"
echo "================================"

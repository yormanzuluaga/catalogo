#!/bin/bash

# API Testing Script for Catalog Backend
# Usage: chmod +x test-api.sh && ./test-api.sh

BASE_URL="http://localhost:4000/api"
echo "🚀 Testing Catalog Backend API"
echo "Base URL: $BASE_URL"
echo "================================"

# Test 1: Server Health Check
echo "1️⃣ Testing server health..."
response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/user)
if [ $response -eq 200 ]; then
    echo "✅ Server is responding"
else
    echo "❌ Server is not responding (HTTP $response)"
    exit 1
fi

# Test 2: Create Test User
echo ""
echo "2️⃣ Creating test user..."
user_response=$(curl -s -X POST $BASE_URL/user \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ana",
    "lastName": "Vendedora",
    "mobile": "573001234567",
    "email": "test.seller@example.com",
    "password": "123456",
    "role": "VENDEDORA_ROLE"
  }')

echo "User creation response: $user_response"

# Test 3: Login
echo ""
echo "3️⃣ Testing login..."
login_response=$(curl -s -X POST $BASE_URL/auth/signIn \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.seller@example.com",
    "password": "123456"
  }')

echo "Login response: $login_response"

# Extract token (simplified - in real scenario use jq)
token=$(echo $login_response | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ ! -z "$token" ]; then
    echo "✅ Login successful, token obtained"
    
    # Test 4: Get My Wallet
    echo ""
    echo "4️⃣ Testing wallet endpoints..."
    wallet_response=$(curl -s -X GET $BASE_URL/wallet/my-wallet \
      -H "Authorization: Bearer $token")
    
    echo "Wallet response: $wallet_response"
    
    # Test 5: Get My Movements
    echo ""
    echo "5️⃣ Testing wallet movements..."
    movements_response=$(curl -s -X GET $BASE_URL/wallet/my-movements \
      -H "Authorization: Bearer $token")
    
    echo "Movements response: $movements_response"
    
else
    echo "❌ Login failed, cannot test authenticated endpoints"
fi

echo ""
echo "🏁 API testing completed!"

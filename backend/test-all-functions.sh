#!/bin/bash

# Comprehensive Test Suite for Liquor POS Test Server
echo "🧪 Starting Comprehensive Test Suite for Liquor POS Test Server"
echo "=============================================================="
echo ""

BASE_URL="http://localhost:5001"
PASS_COUNT=0
FAIL_COUNT=0

# Test function
test_endpoint() {
    local test_name="$1"
    local expected_status="$2"
    local expected_content="$3"
    local curl_command="$4"
    
    echo "🔍 Testing: $test_name"
    
    response=$(eval $curl_command)
    status_code=$(eval "$curl_command -w '%{http_code}'" -o /dev/null -s)
    
    if [[ "$status_code" == "$expected_status" ]] && [[ "$response" == *"$expected_content"* ]]; then
        echo "   ✅ PASS - Status: $status_code"
        ((PASS_COUNT++))
    else
        echo "   ❌ FAIL - Status: $status_code, Expected: $expected_status"
        echo "   Response: $response"
        ((FAIL_COUNT++))
    fi
    echo ""
}

echo "📍 1. Root Endpoint Tests"
test_endpoint "Root endpoint" "200" "Ready for testing" "curl -s $BASE_URL/"

echo "📍 2. Login Function Tests"
test_endpoint "Valid login" "200" "Login successful" "curl -s -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"

test_endpoint "Invalid username" "401" "Invalid credentials" "curl -s -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"wronguser\",\"password\":\"admin123\"}'"

test_endpoint "Invalid password" "401" "Invalid credentials" "curl -s -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"password\":\"wrongpassword\"}'"

test_endpoint "Missing username" "400" "Username and password are required" "curl -s -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"password\":\"admin123\"}'"

test_endpoint "Missing password" "400" "Username and password are required" "curl -s -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"admin\"}'"

test_endpoint "Empty body" "400" "Username and password are required" "curl -s -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{}'"

echo "📍 3. Authentication Token Tests"
# Get a valid token for authenticated tests
TOKEN=$(curl -s -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

test_endpoint "Profile with valid token" "200" "admin" "curl -s -H 'Authorization: Bearer $TOKEN' $BASE_URL/api/auth/profile"

test_endpoint "Profile without token" "401" "No valid token provided" "curl -s $BASE_URL/api/auth/profile"

test_endpoint "Profile with invalid token" "401" "Invalid token" "curl -s -H 'Authorization: Bearer invalid.token.here' $BASE_URL/api/auth/profile"

test_endpoint "Profile with malformed header" "401" "No valid token provided" "curl -s -H 'Authorization: invalidheader' $BASE_URL/api/auth/profile"

test_endpoint "Verify with valid token" "200" "Token is valid" "curl -s -H 'Authorization: Bearer $TOKEN' $BASE_URL/api/auth/verify"

test_endpoint "Verify without token" "401" "No valid token provided" "curl -s $BASE_URL/api/auth/verify"

test_endpoint "Verify with invalid token" "401" "Invalid token" "curl -s -H 'Authorization: Bearer invalid.token.here' $BASE_URL/api/auth/verify"

echo "📍 4. Route Handler Tests"
test_endpoint "API catch-all route" "200" "not implemented in test mode" "curl -s $BASE_URL/api/products"

test_endpoint "404 handler" "404" "Route not found" "curl -s $BASE_URL/nonexistent-route"

echo "📍 5. Edge Case Tests"
test_endpoint "Login with null values" "400" "Username and password are required" "curl -s -X POST $BASE_URL/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":null,\"password\":null}'"

test_endpoint "Empty Bearer token" "401" "No valid token provided" "curl -s -H 'Authorization: Bearer ' $BASE_URL/api/auth/profile"

echo "=============================================================="
echo "🎯 Test Summary:"
echo "   ✅ Passed: $PASS_COUNT"
echo "   ❌ Failed: $FAIL_COUNT"
echo "   📊 Total:  $((PASS_COUNT + FAIL_COUNT))"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "🎉 All tests passed! The server is functioning correctly."
    exit 0
else
    echo "⚠️  Some tests failed. Please review the output above."
    exit 1
fi

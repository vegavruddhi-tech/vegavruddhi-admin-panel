#!/bin/bash

# Test script for unfilled forms sync
# Usage: bash test_unfilled_sync.sh

echo "======================================"
echo "Testing Unfilled Forms Sync"
echo "======================================"
echo ""

# Test 1: Run Python sync script
echo "Test 1: Running Python sync script..."
echo "--------------------------------------"
python sync_unfilled_forms.py --month May --year 2026
echo ""

# Test 2: Check MongoDB for unfilled forms
echo "Test 2: Checking MongoDB for unfilled forms..."
echo "--------------------------------------"
echo "Run this in MongoDB shell:"
echo "  use CompanyDB"
echo "  db.UnfilledForms.countDocuments({ expectedMonth: 'May', expectedYear: 2026 })"
echo ""

# Test 3: Test API endpoints (requires backend running)
echo "Test 3: Testing API endpoints..."
echo "--------------------------------------"
echo "Make sure backend is running on port 4000, then run:"
echo ""
echo "# Get unfilled forms list"
echo "curl http://localhost:4000/api/unfilled-forms/list?month=May&year=2026"
echo ""
echo "# Get statistics"
echo "curl http://localhost:4000/api/unfilled-forms/stats?month=May&year=2026"
echo ""
echo "# Get for Merchant Forms page"
echo "curl http://localhost:4000/api/unfilled-forms/for-merchant-forms?month=May&year=2026"
echo ""

echo "======================================"
echo "Tests Complete!"
echo "======================================"

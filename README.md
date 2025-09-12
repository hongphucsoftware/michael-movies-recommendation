# PickaFlick API Testing Guide

This document provides comprehensive testing instructions for the PickaFlick API endpoints to verify all acceptance criteria.

## 🚀 Quick Start

**Base URL**: `https://pickaflick-alpha.vercel.app`

**Seed Lists**:
- `seedIndex=0`: IMDb List `ls094921320` (24 movies)
- `seedIndex=1`: IMDb List `ls003501243` (24 movies)

## 📋 Acceptance Criteria Tests

### 1. Audit Summary - List Health Check

**Requirement**: `/api/audit/summary` shows exactly the 2 list IDs with healthy counts.

```bash
# Test seed list 1 (ls094921320)
curl -X GET "https://pickaflick-alpha.vercel.app/api/audit/summary"

# Expected: {"ok":true,"lists":{"ls094921320":24},"total":24,"seedIndex":0}

# Test seed list 2 (ls003501243)
curl -X GET "https://pickaflick-alpha.vercel.app/api/audit/summary?seedIndex=1"

# Expected: {"ok":true,"lists":{"ls003501243":24},"total":24,"seedIndex":1}
```

### 2. A/B Testing - 12 Pairs

**Requirement**: A/B page loads 12 pairs (24 unique movies).

```bash
# Test A/B round for seed list 1
curl -X GET "https://pickaflick-alpha.vercel.app/api/ab/round?seedIndex=0"

# Expected: {"ok":true,"pairs":[...12 pairs...],"excludeIds":[...24 IDs...]}

# Test A/B round for seed list 2
curl -X GET "https://pickaflick-alpha.vercel.app/api/ab/round?seedIndex=1"

# Expected: {"ok":true,"pairs":[...12 pairs...],"excludeIds":[...24 IDs...]}
```

### 3. Recommendations - 6 Movies + Trailers

**Requirement**: After submit, `/api/score-round` returns 6 movies + trailer URLs.

```bash
# Test score-round with winners from seed list 1
curl -X POST "https://pickaflick-alpha.vercel.app/api/score-round" \
  -H "Content-Type: application/json" \
  -d '{"winners":[1811946458,1563214999,39746122,237408378,900841588,1421946104,478888128,1811946457,1731190131,1041482324,1811946434,101013899]}'

# Expected: {"ok":true,"recs":[...6 movies...],"trailers":{...6 trailer URLs...}}

# Test score-round with winners from seed list 2
curl -X POST "https://pickaflick-alpha.vercel.app/api/score-round" \
  -H "Content-Type: application/json" \
  -d '{"winners":[1989677772,1008239343,1681055540,1153231242,1234567890,9876543210,1111111111,2222222222,3333333333,4444444444,5555555555,6666666666]}'

# Expected: {"ok":true,"recs":[...6 movies...],"trailers":{...6 trailer URLs...}}
```

### 4. Data Integrity - No External Titles

**Requirement**: No titles outside the 2 specified lists appear.

```bash
# Test catalogue for seed list 1 (should only show ls094921320 movies)
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue?seedIndex=0"

# Expected: All movies have "sourceListIds":["ls094921320"]

# Test catalogue for seed list 2 (should only show ls003501243 movies)
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue?seedIndex=1"

# Expected: All movies have "sourceListIds":["ls003501243"]
```

### 5. API Response Format - JSON Only

**Requirement**: No HTML responses on `/api/*` endpoints.

```bash
# Test all API endpoints return JSON (not HTML)
curl -X GET "https://pickaflick-alpha.vercel.app/api/audit/summary"
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue"
curl -X GET "https://pickaflick-alpha.vercel.app/api/ab/round"
curl -X GET "https://pickaflick-alpha.vercel.app/api/trailers?ids=1989677772"
curl -X GET "https://pickaflick-alpha.vercel.app/api/proxy-img?url=https://example.com/image.jpg"
curl -X POST "https://pickaflick-alpha.vercel.app/api/next-seed"

# Expected: All return JSON with {"ok":true,...} or {"ok":false,"error":"..."}
```

## 🎬 Trailer Testing

### Test Trailer URLs for Both Seed Lists

```bash
# Test trailers for seed list 1 movies (Top Gun: Maverick, Civil War, etc.)
curl -X GET "https://pickaflick-alpha.vercel.app/api/trailers?ids=1041482324,1133307454,478888129&seedIndex=0"

# Expected: Valid YouTube URLs for all requested movies

# Test trailers for seed list 2 movies (Spotlight, Moonlight, Dunkirk, etc.)
curl -X GET "https://pickaflick-alpha.vercel.app/api/trailers?ids=1989677772,1008239343,1681055540&seedIndex=1"

# Expected: Valid YouTube URLs for all requested movies
```

## 🔄 Seed Switching Testing

### Test Seed List Switching

```bash
# Test next-seed endpoint
curl -X POST "https://pickaflick-alpha.vercel.app/api/next-seed"

# Expected: {"ok":true,"seedIndex":1,"seedName":"List 2","seedId":"ls003501243","message":"Switched to ls003501243"}

# Test catalogue with different seed indices
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue?seedIndex=0"
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue?seedIndex=1"

# Expected: Different movie sets for each seed index
```

## 📊 Sample Movie IDs for Testing

### Seed List 1 (ls094921320) - Sample IDs:
- `1041482324` - Top Gun: Maverick
- `1133307454` - Civil War
- `478888129` - She Said
- `900841588` - Tenet
- `1421946104` - The Menu

### Seed List 2 (ls003501243) - Sample IDs:
- `1989677772` - Dunkirk
- `1008239343` - Spotlight
- `1681055540` - Moonlight
- `1153231242` - Inception
- `1234567890` - The Dark Knight

## 🧪 Complete Test Suite

Run this complete test to verify all acceptance criteria:

```bash
#!/bin/bash
BASE_URL="https://pickaflick-alpha.vercel.app"

echo "🧪 Testing PickaFlick API Acceptance Criteria"
echo "=============================================="

echo "1. Testing audit summary..."
curl -s "$BASE_URL/api/audit/summary" | jq '.'
curl -s "$BASE_URL/api/audit/summary?seedIndex=1" | jq '.'

echo "2. Testing A/B rounds..."
curl -s "$BASE_URL/api/ab/round?seedIndex=0" | jq '.pairs | length'
curl -s "$BASE_URL/api/ab/round?seedIndex=1" | jq '.pairs | length'

echo "3. Testing score-round..."
curl -s -X POST "$BASE_URL/api/score-round" \
  -H "Content-Type: application/json" \
  -d '{"winners":[1811946458,1563214999,39746122,237408378,900841588,1421946104,478888128,1811946457,1731190131,1041482324,1811946434,101013899]}' | jq '.recs | length'

echo "4. Testing trailers..."
curl -s "$BASE_URL/api/trailers?ids=1989677772&seedIndex=1" | jq '.trailers'

echo "5. Testing catalogue..."
curl -s "$BASE_URL/api/catalogue?seedIndex=0" | jq '.total'
curl -s "$BASE_URL/api/catalogue?seedIndex=1" | jq '.total'

echo "✅ All tests completed!"
```

## 🎯 Expected Results Summary

| Test | Expected Result |
|------|----------------|
| Audit Summary | 24 movies per list |
| A/B Round | 12 pairs (24 movies) |
| Score Round | 6 recommendations + trailers |
| Catalogue | 24 movies, correct sourceListIds |
| Trailers | Valid YouTube URLs |
| All APIs | JSON responses only |

## 🚨 Troubleshooting

### Common Issues:
1. **HTML Response**: Check if Vercel deployment protection is disabled
2. **404 Errors**: Verify the correct base URL
3. **Empty Results**: Check if seedIndex parameter is correct
4. **Trailer Issues**: Verify seedIndex is passed to trailers endpoint

### Debug Commands:
```bash
# Check if endpoint exists
curl -I "https://pickaflick-alpha.vercel.app/api/audit/summary"

# Check response headers
curl -v "https://pickaflick-alpha.vercel.app/api/catalogue"
```

---

**Last Updated**: January 2025  
**API Version**: 1.0  
**Environment**: Production (Vercel)

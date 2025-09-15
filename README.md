# PickaFlick API Testing Guide

This document provides comprehensive testing instructions for the PickaFlick API endpoints to verify all acceptance criteria.

## 🚀 Quick Start

**Base URL**: `https://pickaflick-alpha.vercel.app`

**Seed Lists**:
- `seedIndex=0`: IMDb List `ls094921320` (24 movies)
- `seedIndex=1`: IMDb List `ls003501243` (24 movies)

## 🔧 API Endpoints Overview

### Core API Endpoints

| Endpoint | Method | Purpose | Description |
|----------|--------|---------|-------------|
| `/api/audit/summary` | GET | Health Check | Returns count of movies in each seed list |
| `/api/ab/round` | GET | A/B Testing | Returns 12 pairs of movies for user selection |
| `/api/score-round` | POST | Recommendations | Returns 6 personalized movie recommendations |
| `/api/catalogue` | GET | Movie Database | Returns full list of movies from current seed |
| `/api/trailers` | GET | Trailer URLs | Returns YouTube trailer URLs for specified movies |
| `/api/next-seed` | POST | Seed Switching | Switches between available seed lists |
| `/api/proxy-img` | GET | Image Proxy | Proxies external images to avoid CORS issues |

### Detailed API Descriptions

#### `/api/audit/summary`
**Purpose**: Health check and data validation  
**Returns**: Count of movies per seed list, total movies, current seed index  
**Use Case**: Verify data integrity and list health

#### `/api/ab/round`
**Purpose**: Generate A/B test pairs for user preference learning  
**Returns**: 12 pairs (24 movies total) with excludeIds list  
**Use Case**: Present movies to users for preference selection

#### `/api/score-round`
**Purpose**: Generate personalized recommendations based on user choices  
**Input**: Array of 12 winner movie IDs from A/B round  
**Returns**: 6 recommended movies + their trailer URLs  
**Use Case**: Provide personalized movie suggestions

#### `/api/catalogue`
**Purpose**: Access full movie database for current seed list  
**Returns**: Complete list of movies with metadata  
**Use Case**: Browse all available movies, get movie details

#### `/api/trailers`
**Purpose**: Get YouTube trailer URLs for specific movies  
**Input**: Comma-separated movie IDs  
**Returns**: Object mapping movie IDs to trailer URLs  
**Use Case**: Play movie trailers in the application

#### `/api/next-seed`
**Purpose**: Switch between available seed lists  
**Returns**: New seed index, name, and ID  
**Use Case**: Change movie database (e.g., from List 1 to List 2)

#### `/api/proxy-img`
**Purpose**: Proxy external images to avoid CORS restrictions  
**Input**: Image URL as query parameter  
**Returns**: Proxied image data  
**Use Case**: Display movie posters from external sources

## 🔄 API Workflow

### Typical User Journey

1. **Start**: User visits the application
   - Frontend calls `/api/catalogue` to load available movies
   - Frontend calls `/api/audit/summary` to verify data health

2. **A/B Testing Phase**: User selects movie preferences
   - Frontend calls `/api/ab/round` to get 12 movie pairs
   - User makes 12 selections (24 total choices)
   - Frontend stores user preferences

3. **Recommendation Phase**: Get personalized suggestions
   - Frontend calls `/api/score-round` with user's 12 winner IDs
   - Backend analyzes preferences and returns 6 recommendations
   - Frontend calls `/api/trailers` to get trailer URLs for recommendations

4. **Seed Switching**: Change movie database
   - User clicks "New Round" button
   - Frontend calls `/api/next-seed` to switch seed lists
   - Process repeats with new movie database

### Data Flow Diagram

```
User → Frontend → API Endpoints → SEED Data
  ↓
1. /api/catalogue (load movies)
2. /api/ab/round (get pairs)
3. User selections
4. /api/score-round (get recommendations)
5. /api/trailers (get trailer URLs)
6. Display results
```

### Key Features

- **Stateless Design**: All APIs work independently
- **Seed Index Support**: Most endpoints accept `seedIndex` parameter
- **Local Data Only**: No external API calls, uses SEED data exclusively
- **YouTube Integration**: Direct YouTube trailer URLs
- **CORS Handling**: Image proxy for external movie posters

## 🧠 Recommendation Algorithm

### How Recommendations Work

The `/api/score-round` endpoint uses a sophisticated Taste Dial + Elo-lite algorithm to generate personalized recommendations:

1. **Taste Dial Updates**: For each winner movie, updates preference counters:
   - Actors: +1 per actor (weight: 5x in scoring)
   - Directors: +2 per director (weight: 10x in scoring) 
   - Genres: +1 per genre (weight: 3x in scoring)

2. **Elo-lite Scoring**: Each winner gets +20 points, losers get -20 points

3. **Recommendation Scoring**: For each movie in catalogue:
   - Base score: 1500 (or existing Elo score)
   - Actor bonus: +5 × taste_dial_count for each matching actor
   - Director bonus: +10 × taste_dial_count for matching director
   - Genre bonus: +3 × taste_dial_count for each matching genre

4. **Selection Process**: 
   - Sort all movies by total score (descending)
   - Take top 12 candidates
   - Shuffle for diversity
   - Return top 6 recommendations

5. **Output**: Returns 6 personalized recommendations with trailer URLs

### A/B Round Algorithm

The `/api/ab/round` endpoint uses a sophisticated Elo-based pairing algorithm:

1. **Score Initialization**: All movies start with 1500 Elo score if not previously rated

2. **Champion Selection**: 
   - Sort movies by Elo score (descending)
   - Pick champions from top quartile (strongest movies)
   - Random selection within top quartile for variety

3. **Challenger Matching**:
   - Find challengers within 40-120 Elo points of champion
   - Ensures competitive matchups (not blowouts)
   - Fallback to random eligible movie if no good challenger

4. **Pair Management**:
   - Track used movies to prevent duplicates
   - Generate exactly 12 unique pairs (24 movies)
   - Return excludeIds list for frontend state management

5. **Output**: Returns 12 pairs with left/right structure + excludeIds array

### Movie Data Structure

Each movie in the SEED data contains:

```json
{
  "tt": "tt1745960",
  "title": "Top Gun: Maverick",
  "poster": "https://m.media-amazon.com/images/...",
  "trailer": "https://www.youtube.com/watch?v=g4U4BQW9OEk",
  "year": 2022,
  "genres": ["Action", "Drama"],
  "director": "Joseph Kosinski",
  "actors": ["Tom Cruise", "Miles Teller", "Jennifer Connelly"]
}
```

### Seed List Information

- **SEED_LIST_1** (`ls094921320`): 24 movies from IMDb list
- **SEED_LIST_2** (`ls003501243`): 24 movies from IMDb list
- **Total Movies**: 48 movies across both lists
- **Data Source**: Local SEED data only (no external APIs)

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

### 1b. Capacity APIs (all seeds)

```bash
# New: overall capacity across all seed lists
curl -X GET "https://pickaflick-alpha.vercel.app/api/audit/capacity"

# New: catalogue capacity listing each seed with seedIndex, seedId, count
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue/capacity"

# New: list ALL items across all 5 seed lists
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue/all"
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

# Optional: Verify seed 3/4/5 as well
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue?seedIndex=2"
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue?seedIndex=3"
curl -X GET "https://pickaflick-alpha.vercel.app/api/catalogue?seedIndex=4"
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

# Overview

PickaFlick is a React-based movie recommendation application with the tagline "Seconds now will save you hours later" that uses machine learning to learn user preferences and curate personalized trailer queues from the authentic IMDb Top 250. The app employs a Netflix-style interface where users pick posters based on gut feeling during an onboarding phase. Our AI learns taste in real-time and curates the perfect trailer queue. Users can watch YouTube trailers with Skip/Save functionality and build a watchlist. The application uses browser localStorage for data persistence and features a responsive design with Tailwind CSS and shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes (September 2025)

- **Enhanced A/B-Based Personalization (Sept 1)**: Fixed recommendation algorithm to properly reflect A/B test choices:
  - **Tightened Alignment**: Upgraded to 65% cosine + 35% genre scoring with minimum taste filters (MIN_REL=0.35)
  - **Quality Filtering**: Only considers top 120 scored titles with combo threshold (MIN_COMBO=0.28) for better correlation
  - **Reduced Temperature**: Lowered softmax from 0.65 to 0.45 for tighter taste adherence while maintaining variety
  - **Brand Deduplication**: Caps to 1 per brand (no more 3x Batman variants in same queue)
  - **Mobile-Responsive Design**: Fully responsive layout optimized for both mobile and desktop experiences
  - **Debug Panel**: Shows alignment metrics with "Strong/Mild/Weak" verdict based on cosine similarity and genre correlation

- **Complete Trailer System**: Implemented full personalized recommendation engine:
  - **Full Catalogue Access**: All 432 movies from 3 authentic sources (RT 2020, IMDb Top 250, IMDb List) 
  - **A/B History Tracking**: Records user choices during 12-round A/B testing for personalization
  - **Enhanced Trailer Discovery**: TMDb YouTube videos + RT/IMDb page scraping + YouTube search fallback
  - **Batch Trailer Fetching**: Prefetches all trailer URLs with 24h caching for smooth playback
  - **Auto-Play**: Automatically selects and plays first available trailer from personalized set

# Previous Changes (August 2025)

- **Performance Optimization**: Implemented smart caching and progressive loading - app now loads in seconds instead of minutes with 30-minute cache and background processing
- **Latest Branding Update**: Updated to new tagline "Find Your Next Favourite in Minutes" with description "Tired of scrolling endlessly? We've flipped the script." Added detailed feature explanations for Quick Picks, Smart Match, and Trailer Feed
- **UI Enhancement**: Removed all play button logos from trailer interface as requested, using Skip/Save buttons with appropriate icons instead
- **Enhanced Catalogue System**: Combined authentic IMDb Top 50 classics with 50 best movies from 2020-2024, eliminating duplicates and providing both timeless and recent hits
- **Duplicate Prevention**: Enhanced ML choice system to prevent repeated poster pairs during onboarding
- **Button Enhancement**: Improved trailer page button visibility with bright Netflix-themed colors and better contrast
- **Title & SEO**: Updated document title and meta description to match new branding

# System Architecture

## Frontend Architecture
The application uses a modern React architecture with TypeScript and Vite as the build tool. The frontend is organized in a typical React project structure with components, hooks, and utility libraries. The UI layer leverages shadcn/ui component library built on Radix UI primitives for consistent, accessible interface elements.

**Key architectural decisions:**
- **Component Structure**: Modular component architecture with separate components for Header, OnboardingSection, TrailerWheelSection, and WatchlistSection
- **State Management**: Custom React hooks (useMLLearning, useMovieData) manage complex application state without external state management libraries
- **Styling**: Tailwind CSS with custom Netflix-themed color palette and animations
- **Type Safety**: Full TypeScript implementation with proper type definitions for Movie, UserPreferences, and MLState interfaces

## Backend Architecture
The backend uses Express.js with TypeScript in a minimalist setup. The current implementation includes a basic server structure with route registration and error handling middleware, but most routes are not yet implemented.

**Key architectural decisions:**
- **Server Framework**: Express.js chosen for simplicity and flexibility
- **Storage Layer**: Abstracted storage interface (IStorage) with in-memory implementation (MemStorage) for development
- **Development Setup**: Vite middleware integration for hot module replacement during development
- **Build Process**: esbuild for backend bundling and Vite for frontend assets

## Machine Learning System
The application implements a sophisticated personalized recommendation system combining preference learning with diversity algorithms.

**Key architectural decisions:**
- **Feature Engineering**: 12-dimensional feature vectors representing movie characteristics (10 genres + era + popularity)
- **A/B Learning**: Records user choices during poster selection to build preference profile
- **Personalized Ranking**: Cosine similarity scoring against learned vector + "more like chosen movies" boost
- **MMR Diversity**: Maximal Marginal Relevance algorithm prevents showing only similar movies
- **Smart Fallbacks**: For new users with weak signals, uses broader diverse sampling to avoid popular classics dominance
- **Data Persistence**: Browser localStorage for learned preferences, A/B history, and exploration state

## Data Storage
The application currently uses browser localStorage for all user data persistence, with a planned migration path to PostgreSQL database.

## Data Sources
The application uses three authentic high-quality movie sources with comprehensive scraping and fallback systems:

**Primary Sources:**
- **Rotten Tomatoes 2020 Editorial List**: Best movies of 2020 for recent quality content
- **IMDb Top 250**: Classic high-rated movies for timeless recommendations  
- **IMDb Custom List (ls545836395)**: Curated additional quality titles

**Trailer Discovery:**
- **Primary**: TMDb video API for official YouTube trailers
- **Fallback**: Direct YouTube search by movie title + year when TMDb has none
- **Intelligence**: Smart scoring of trailer quality (official > fan-made, trailer > teaser, HD preference)
- **Caching**: 24-hour cache to prevent rate limiting and improve performance

**Key architectural decisions:**
- **Development Storage**: localStorage for immediate functionality without backend dependencies
- **Production Ready**: Drizzle ORM configured for PostgreSQL with user authentication schema
- **Database Migration**: Drizzle Kit setup for schema management and migrations
- **Session Management**: connect-pg-simple configured for PostgreSQL session storage

# External Dependencies

## Core Framework Dependencies
- **React 18**: Frontend framework with modern hooks and concurrent features
- **Express.js**: Backend web framework for API routes and middleware
- **TypeScript**: Type safety across frontend and backend
- **Vite**: Development server and build tool with HMR support

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Accessible, unstyled UI components for complex interactions
- **Lucide React**: Icon library for consistent iconography

## Data Layer
- **Drizzle ORM**: TypeScript-first ORM for PostgreSQL integration
- **@neondatabase/serverless**: Serverless PostgreSQL adapter for cloud deployment
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## Development Tools
- **tsx**: TypeScript execution environment for development
- **esbuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay for Replit environment
- **@replit/vite-plugin-cartographer**: Replit-specific development tools

## Utility Libraries
- **zod**: Runtime type validation and schema definitions
- **date-fns**: Date manipulation and formatting utilities
- **clsx & tailwind-merge**: Conditional CSS class management
- **class-variance-authority**: Component variant management system
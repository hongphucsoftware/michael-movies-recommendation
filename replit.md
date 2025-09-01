# Overview

PickaFlick is a React-based movie recommendation application with the tagline "Seconds now will save you hours later" that uses machine learning to learn user preferences and curate personalized trailer queues from the authentic IMDb Top 250. The app employs a Netflix-style interface where users pick posters based on gut feeling during an onboarding phase. Our AI learns taste in real-time and curates the perfect trailer queue. Users can watch YouTube trailers with Skip/Save functionality and build a watchlist. The application uses browser localStorage for data persistence and features a responsive design with Tailwind CSS and shadcn/ui components.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes (August 2025)

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
The application implements a custom logistic regression model for learning user preferences based on poster selection data.

**Key architectural decisions:**
- **Feature Engineering**: 12-dimensional feature vectors representing movie characteristics (Comedy, Drama, Action, Thriller, SciFi, Fantasy, Documentary, LightTone, DarkTone, FastPace, SlowPace, EpisodeLengthShort)
- **Learning Algorithm**: Online logistic regression with configurable learning rate (0.6) and exploration parameter (epsilon-greedy strategy)
- **Data Persistence**: Browser localStorage for user preferences, exploration history, and watchlist
- **Recommendation Logic**: Preference-based scoring with exploration/exploitation balance for diverse recommendations

## Data Storage
The application currently uses browser localStorage for all user data persistence, with a planned migration path to PostgreSQL database.

## Data Sources
The application now uses authentic IMDb Top 250 data sourced from the movie-monk-b0t GitHub repository (auto-updated every 6 hours) instead of TMDb's "top rated" endpoint. This provides real classic movies like "The Shawshank Redemption", "Whiplash", "WALL-E", and "Warrior". YouTube trailers are obtained by cross-referencing IMDb IDs with TMDb's database.

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
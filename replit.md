# iSMS - School Management System

## Overview

iSMS is a comprehensive SaaS School Management System built as a modern web application with React frontend and Node.js backend. The system is designed with a modular architecture supporting multiple applications including Forms management, Events, SOPs, Asset tracking, and administrative functions. The application is optimized for mobile deployment through React GO and features a responsive design system with role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Styling**: Tailwind CSS with custom design system variables
- **State Management**: React Context for global state (Auth, App) and TanStack Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit OAuth with passport.js and session management
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **API Design**: RESTful API with Express routes and middleware

### Database Design
- **Core Tables**: Users, forms, form responses, and sessions
- **Schema Management**: Drizzle Kit for migrations and schema generation
- **Data Validation**: Zod schemas shared between frontend and backend
- **Database Provider**: Neon serverless PostgreSQL

### Design System
- **Color Palette**: Custom iSMS brand colors with CSS custom properties
- **Typography**: Inter font family with multiple weights
- **Responsive Design**: Mobile-first approach with collapsible sidebar (240px desktop, 80px collapsed)
- **Touch Optimization**: Minimum 44px touch targets for mobile compatibility
- **Component Library**: Reusable UI components with consistent styling

### Authentication & Authorization
- **OAuth Provider**: Replit OAuth integration
- **Session Management**: Secure HTTP-only cookies with PostgreSQL storage
- **Role-based Access**: User types (HOD, Master Admin) with feature permissions
- **Route Protection**: Authentication middleware for protected endpoints

### Mobile Optimization
- **React GO Compatible**: Structured for seamless mobile app deployment
- **Responsive Layout**: Desktop sidebar transforms to bottom navigation on mobile
- **Touch Interface**: Optimized touch targets and mobile-friendly interactions
- **Progressive Enhancement**: Works across desktop, tablet, and mobile devices

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form, TanStack Query
- **UI Components**: Radix UI primitives, Lucide React icons
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **Build Tools**: Vite, TypeScript, ESBuild

### Backend Dependencies
- **Express Framework**: Express.js with middleware for JSON parsing and CORS
- **Database**: Drizzle ORM, @neondatabase/serverless, PostgreSQL
- **Authentication**: Passport.js, openid-client, express-session
- **Session Storage**: connect-pg-simple for PostgreSQL session store

### Development Tools
- **Database Management**: Drizzle Kit for schema migrations
- **Code Quality**: TypeScript for type safety
- **Development Server**: Vite dev server with HMR
- **Replit Integration**: Replit-specific plugins for development environment

### Third-party Services
- **Database Hosting**: Neon serverless PostgreSQL
- **Authentication Provider**: Replit OAuth service
- **Font Service**: Google Fonts (Inter family)
- **Icon Library**: Lucide React icon set

### Mobile Deployment
- **React GO**: Framework compatibility for mobile app generation
- **WebSocket Support**: Real-time features with WebSocket constructor
- **Touch Events**: Mobile-optimized event handling
- **Responsive Breakpoints**: CSS media queries for different screen sizes
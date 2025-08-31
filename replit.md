# Manufacturing Shop Floor Scheduler

## Overview

This is a manufacturing shop floor scheduling application built with a full-stack TypeScript architecture. The system manages assembly cards (work orders) and assemblers (workstations/machines) in a visual drag-and-drop interface. It provides both a Gantt chart view and a swim lane scheduler view for managing manufacturing workflows, dependencies, and resource allocation.

The application handles complex manufacturing scenarios including dependency management between assembly cards, phase-based workflow organization, and real-time status tracking of both work orders and equipment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Drag & Drop**: React DnD with HTML5 and Touch backends for mobile support
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Design Pattern**: Component-based architecture with custom hooks for data fetching

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Data Layer**: Drizzle ORM for type-safe database operations
- **Storage**: In-memory storage implementation with interface for future database integration
- **API Design**: RESTful API with structured error handling and request logging
- **Validation**: Zod schemas shared between frontend and backend
- **Build System**: ESBuild for production bundling

### Data Storage Solutions
- **Current**: In-memory storage using Maps for development/demo purposes
- **Configured For**: PostgreSQL with Drizzle ORM (via @neondatabase/serverless)
- **Schema**: Strongly typed with Drizzle schema definitions
- **Migrations**: Drizzle Kit for database schema management

### Key Data Models
- **Assemblers**: Manufacturing stations with types (mechanical, electrical, final, qc) and status tracking
- **Assembly Cards**: Work orders with dependencies, phases, duration, and assignment tracking
- **Dependencies**: Card-to-card dependency relationships for workflow sequencing

### External Dependencies
- **Database**: Neon PostgreSQL (configured but using in-memory storage currently)
- **UI Components**: Radix UI primitives for accessible component foundation
- **Fonts**: Google Fonts (Inter, Architects Daughter, DM Sans, Fira Code, Geist Mono)
- **Development**: Replit-specific tooling for development environment integration

### Architecture Decisions

**Monorepo Structure**: Single repository with shared TypeScript types between client and server, enabling type safety across the full stack.

**Component Library Choice**: Shadcn/ui chosen for its flexibility, accessibility, and customization capabilities while providing a consistent design system.

**State Management**: TanStack Query selected for its excellent caching, synchronization, and server state management capabilities, eliminating the need for additional global state management.

**Database Abstraction**: Storage interface pattern allows switching between in-memory and persistent storage without changing business logic.

**Drag & Drop Implementation**: React DnD provides robust drag-and-drop functionality with proper accessibility support and mobile compatibility.

**Type Safety**: Zod schemas shared between frontend and backend ensure runtime validation matches TypeScript types, reducing bugs and improving developer experience.
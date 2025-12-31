# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Documentation First

**Before generating any code, always check the `/docs` directory for relevant standards and guidelines.** Key documentation:

- `docs/ui.md` - UI component standards, accessibility, responsiveness, date formatting
- `docs/data-fetching.md` - Data fetching patterns, database access, user data isolation
- `docs/auth.md` - Authentication flows, protected routes, user session management
- `docs/data-mutations.md` - Data mutation patterns, optimistic updates, error handling

## Commands

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

This is a Next.js 16 application using the App Router with React 19 and TypeScript.

**Key technologies:**

- Tailwind CSS 4 (via PostCSS)
- React Compiler enabled (`reactCompiler: true` in next.config.ts)
- Clerk authentication (`@clerk/nextjs`)
- Drizzle ORM with Neon (PostgreSQL)
- shadcn/ui components (installed to `src/components/ui/`)
- date-fns for date formatting
- Geist font family
- Zod for schema validation

**Path alias:** `@/*` maps to `./src/*`

**Structure:**

- `src/app/` - App Router pages and layouts
- `src/app/layout.tsx` - Root layout with ClerkProvider and auth components
- `src/app/page.tsx` - Home page
- `src/app/globals.css` - Global styles and Tailwind imports
- `src/proxy.ts` - Clerk middleware using `clerkMiddleware()`

## Authentication

Clerk handles authentication. Key components in layout.tsx:

- `<ClerkProvider>` wraps the app
- `<SignedIn>` / `<SignedOut>` for conditional rendering
- `<UserButton>` for user menu, `<SignInButton>` / `<SignUpButton>` for auth

For server-side auth, use `auth()` from `@clerk/nextjs/server` (async/await required).

Environment variables required in `.env.local`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Database

Drizzle ORM with Neon PostgreSQL. Use `drizzle-kit` for migrations:

- `npx drizzle-kit generate` - Generate migrations
- `npx drizzle-kit migrate` - Run migrations
- `npx drizzle-kit studio` - Open Drizzle Studio

Environment variable required:

- `DATABASE_URL` - Neon connection string

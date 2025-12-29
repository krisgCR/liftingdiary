# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- Geist font family

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

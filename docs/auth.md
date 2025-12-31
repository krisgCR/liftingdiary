# Authentication Standards

This document outlines the authentication standards for the Lifting Diary project. All contributors must follow these guidelines.

## Authentication Provider

**This application uses [Clerk](https://clerk.com/) for authentication.** Do not implement custom authentication solutions.

## Environment Variables

Required environment variables in `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
```

Never commit these values to version control. The `.env.local` file is gitignored.

## Architecture Overview

### ClerkProvider

The entire application is wrapped with `ClerkProvider` in the root layout:

```typescript
// src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### Middleware

Clerk middleware protects routes and handles authentication state. Located at `src/proxy.ts`:

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

## Client-Side Components

### Conditional Rendering Based on Auth State

Use Clerk's components for conditional UI rendering:

```typescript
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

// Show content only to signed-in users
<SignedIn>
  <UserButton />
  <ProtectedContent />
</SignedIn>

// Show content only to signed-out users
<SignedOut>
  <SignInButton mode="modal" />
  <SignUpButton mode="modal" />
</SignedOut>
```

### Available Clerk Components

| Component       | Purpose                                    |
| --------------- | ------------------------------------------ |
| `<SignedIn>`    | Wrapper for authenticated-only content     |
| `<SignedOut>`   | Wrapper for unauthenticated-only content   |
| `<SignInButton>`| Button/link to sign in (supports modal)    |
| `<SignUpButton>`| Button/link to sign up (supports modal)    |
| `<UserButton>`  | User avatar with dropdown menu             |
| `<UserProfile>` | Full user profile management component     |

### Modal vs Redirect Mode

Prefer `mode="modal"` for sign-in/sign-up buttons to keep users on the current page:

```typescript
// Preferred - opens modal overlay
<SignInButton mode="modal" />

// Alternative - redirects to Clerk-hosted page
<SignInButton mode="redirect" />
```

## Server-Side Authentication

### Getting the Current User

Use `auth()` from `@clerk/nextjs/server` in Server Components and Server Actions. **This function is async and must be awaited.**

```typescript
import { auth } from "@clerk/nextjs/server";

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  // userId is now guaranteed to be a string
  const data = await fetchUserData(userId);
}
```

### auth() Return Values

The `auth()` function returns an object containing:

| Property   | Type             | Description                          |
| ---------- | ---------------- | ------------------------------------ |
| `userId`   | `string \| null` | The authenticated user's ID          |
| `sessionId`| `string \| null` | The current session ID               |
| `orgId`    | `string \| null` | Organization ID (if using orgs)      |

### Handling Unauthenticated Users

Always check for `userId` before accessing protected resources:

```typescript
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    // Option 1: Redirect to home/sign-in
    redirect("/");

    // Option 2: Redirect to Clerk sign-in
    // redirect("/sign-in");
  }

  // Proceed with authenticated logic
}
```

### Server Actions

Always verify authentication in Server Actions:

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";

export async function createWorkout(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // userId is guaranteed to exist here
  await db.insert(workouts).values({
    userId,
    name: formData.get("name") as string,
  });
}
```

## Security Best Practices

### 1. Never Trust Client-Provided User IDs

Always get `userId` from `auth()` on the server, never from client-provided data:

```typescript
// WRONG - userId could be forged
export async function updateProfile(userId: string, data: ProfileData) {
  await db.update(users).set(data).where(eq(users.id, userId));
}

// CORRECT - userId comes from authenticated session
export async function updateProfile(data: ProfileData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.update(users).set(data).where(eq(users.id, userId));
}
```

### 2. User Data Isolation

All database queries for user-owned data MUST filter by `userId`. See [data-fetching.md](./data-fetching.md) for detailed patterns.

```typescript
// Every data function requires userId and filters by it
export async function getWorkouts(userId: string) {
  return db.select().from(workouts).where(eq(workouts.userId, userId));
}
```

### 3. Protect API Routes

If you must create API routes, always verify authentication:

```typescript
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle authenticated request
}
```

### 4. Avoid Exposing User Data in URLs

Don't include user IDs in public URLs. Use session-based identification:

```typescript
// WRONG - exposes user ID
// /users/user_abc123/workouts

// CORRECT - user determined from session
// /dashboard/workouts
```

## Common Patterns

### Protected Page Template

```typescript
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  // Fetch user-specific data
  const data = await getUserData(userId);

  return (
    <main>
      {/* Render protected content */}
    </main>
  );
}
```

### Auth Check in Layout

For protecting entire route segments:

```typescript
// src/app/dashboard/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return <>{children}</>;
}
```

## Checklist for Auth-Related Code

Before merging any authentication-related code, verify:

- [ ] `auth()` is awaited (it's an async function)
- [ ] `userId` is checked before accessing protected resources
- [ ] Unauthenticated users are redirected appropriately
- [ ] User IDs come from `auth()`, not from client input
- [ ] Database queries filter by `userId` for user-owned data
- [ ] Server Actions verify authentication before mutations
- [ ] No sensitive user data is exposed in URLs or client-side code

## Anti-Patterns to Avoid

### 1. Forgetting to Await auth()

```typescript
// WRONG - auth() is async
const { userId } = auth();

// CORRECT
const { userId } = await auth();
```

### 2. Checking Auth in Client Components

```typescript
// WRONG - auth checks should happen on the server
"use client";

export function ProtectedButton() {
  const { userId } = useAuth(); // Don't use for authorization
  if (!userId) return null;
  return <button>Protected Action</button>;
}
```

Client-side auth state (`useAuth`, `useUser`) is for UI purposes only. Always verify authentication on the server before performing protected operations.

### 3. Missing Auth Check in Server Actions

```typescript
// WRONG - no auth verification
"use server";
export async function deleteWorkout(workoutId: string) {
  await db.delete(workouts).where(eq(workouts.id, workoutId));
}

// CORRECT - verifies auth and ownership
"use server";
export async function deleteWorkout(workoutId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
}
```

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk + Next.js Guide](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Components Reference](https://clerk.com/docs/components/overview)

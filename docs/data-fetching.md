# Data Fetching Standards

This document outlines the data fetching standards for the Lifting Diary project. All contributors must follow these guidelines strictly.

## Core Principle: Server Components Only

**ALL data fetching MUST be done via Server Components.** This is non-negotiable.

### Allowed

- Fetching data directly in Server Components (`page.tsx`, `layout.tsx`, or any component without `"use client"`)
- Calling data helper functions from `/src/data/` within Server Components

### NOT Allowed

- Route Handlers (`/api/*` routes) for data fetching
- Fetching data in Client Components via `useEffect` or other hooks
- Using Server Actions (`"use server"`) for initial data fetching
- Direct `fetch()` calls to external APIs from Client Components
- Any other client-side data fetching pattern

### Why Server Components Only?

1. **Security** - Database credentials and queries never reach the browser
2. **Performance** - No client-side waterfalls; data is ready before HTML is sent
3. **Simplicity** - No loading states needed for initial page data
4. **SEO** - Content is rendered server-side and immediately available

## Database Access Architecture

### Directory Structure

```
src/
├── data/                    # Data access layer (helper functions)
│   ├── workouts.ts          # Workout-related queries
│   ├── exercises.ts         # Exercise-related queries
│   └── sets.ts              # Set-related queries
├── db/
│   ├── index.ts             # Database connection
│   └── schema.ts            # Drizzle schema definitions
└── app/
    └── [page]/
        └── page.tsx         # Server Components that call /data functions
```

### Data Helper Functions

All database queries MUST be implemented as helper functions in the `/src/data/` directory:

```typescript
// src/data/workouts.ts
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getWorkoutsByDate(userId: string, date: string) {
  return db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.date, date)));
}

export async function getWorkoutById(userId: string, workoutId: string) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.id, workoutId)));

  return workout ?? null;
}
```

### Using Data Functions in Server Components

```typescript
// src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWorkoutsByDate } from "@/data/workouts";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  // Fetch data directly in the Server Component
  const today = new Date().toISOString().split("T")[0];
  const workouts = await getWorkoutsByDate(userId, today);

  return (
    <main>
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </main>
  );
}
```

## Drizzle ORM Requirements

**Use Drizzle ORM exclusively. DO NOT use raw SQL.**

### Allowed

```typescript
// Drizzle query builder
const workouts = await db
  .select()
  .from(workouts)
  .where(eq(workouts.userId, userId));

// Drizzle relations
const result = await db
  .select()
  .from(workouts)
  .innerJoin(workoutExercises, eq(workouts.id, workoutExercises.workoutId));
```

### NOT Allowed

```typescript
// Raw SQL - NEVER do this
await db.execute(sql`SELECT * FROM workouts WHERE user_id = ${userId}`);

// String interpolation - NEVER do this
await db.execute(`SELECT * FROM workouts WHERE user_id = '${userId}'`);
```

### Why Drizzle Only?

1. **Type safety** - Full TypeScript support with inferred types
2. **SQL injection prevention** - Query builder escapes inputs automatically
3. **Maintainability** - Schema changes are reflected in queries
4. **Consistency** - Single query pattern across the codebase

## User Data Isolation (CRITICAL)

**A logged-in user MUST only be able to access their own data. This is a critical security requirement.**

### Authentication Pattern

Every data function MUST receive `userId` as a parameter and filter by it:

```typescript
// CORRECT - userId is required and used in the query
export async function getWorkouts(userId: string) {
  return db.select().from(workouts).where(eq(workouts.userId, userId));
}

// WRONG - No user filtering, exposes all users' data
export async function getWorkouts() {
  return db.select().from(workouts);
}
```

### Server Component Pattern

Always verify authentication before fetching data:

```typescript
export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // userId is now guaranteed to exist
  const data = await getUserData(userId);
}
```

### Query Filtering Rules

| Table             | Filter Required                                  |
| ----------------- | ------------------------------------------------ |
| `workouts`        | Always filter by `userId`                        |
| `exercises`       | Filter by `userId` OR `userId IS NULL` (system)  |
| `workoutExercises`| Join through `workouts` with `userId` filter     |
| `sets`            | Join through `workoutExercises` → `workouts`     |

### Example: Safe Nested Query

```typescript
export async function getWorkoutWithExercises(userId: string, workoutId: string) {
  // First verify the workout belongs to the user
  const [workout] = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));

  if (!workout) {
    return null; // User doesn't own this workout
  }

  // Now safe to fetch related data
  const exercises = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId));

  return { ...workout, exercises };
}
```

## Handling Client Interactivity

When a page requires user interaction that changes the displayed data (e.g., date picker, filters):

### Option 1: URL Search Params (Preferred)

Use URL search params and let the Server Component re-render:

```typescript
// page.tsx
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { userId } = await auth();
  const { date } = await searchParams;
  const selectedDate = date || new Date().toISOString().split("T")[0];

  const workouts = await getWorkoutsByDate(userId!, selectedDate);

  return (
    <main>
      <DatePickerNav currentDate={selectedDate} />
      <WorkoutList workouts={workouts} />
    </main>
  );
}

// date-picker-nav.tsx (Client Component)
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function DatePickerNav({ currentDate }: { currentDate: string }) {
  const router = useRouter();

  const handleDateChange = (newDate: Date) => {
    const dateString = newDate.toISOString().split("T")[0];
    router.push(`?date=${dateString}`);
  };

  return <DatePicker value={currentDate} onChange={handleDateChange} />;
}
```

### Option 2: Server Actions for Mutations

Use Server Actions only for write operations (create, update, delete):

```typescript
// actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";

export async function addWorkout(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const name = formData.get("name") as string;
  const date = formData.get("date") as string;

  await createWorkout(userId, { name, date });
  revalidatePath("/dashboard");
}
```

## Type Definitions

Define return types for data functions to ensure type safety:

```typescript
// src/data/types.ts
export type Workout = {
  id: string;
  userId: string;
  name: string | null;
  date: string;
  notes: string | null;
};

export type WorkoutWithExercises = Workout & {
  exercises: {
    id: string;
    order: number;
    exercise: Exercise;
    sets: Set[];
  }[];
};
```

## Checklist for New Data Functions

Before merging any new data fetching code, verify:

- [ ] Function is in `/src/data/` directory
- [ ] Uses Drizzle ORM (no raw SQL)
- [ ] Requires `userId` parameter for user-owned data
- [ ] Filters queries by `userId`
- [ ] Called from a Server Component (not Client Component)
- [ ] Has proper TypeScript return type
- [ ] Does not expose data from other users

## Anti-Patterns to Avoid

### 1. Fetching in Client Components

```typescript
// WRONG
"use client";

export function WorkoutList() {
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    fetch("/api/workouts").then((r) => r.json()).then(setWorkouts);
  }, []);
}
```

### 2. Creating API Routes for Data

```typescript
// WRONG - Don't create /api routes for fetching data
// src/app/api/workouts/route.ts
export async function GET() {
  const workouts = await db.select().from(workouts);
  return Response.json(workouts);
}
```

### 3. Missing User Filtering

```typescript
// WRONG - Returns all users' workouts
export async function getAllWorkouts() {
  return db.select().from(workouts);
}
```

### 4. Trusting Client-Provided User ID

```typescript
// WRONG - Never trust userId from client
export async function getWorkouts(userId: string) {
  // userId could be forged by malicious client
}

// CORRECT - Always get userId from auth() on the server
const { userId } = await auth();
```

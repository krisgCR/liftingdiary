# Data Mutation Standards

This document outlines the data mutation standards for the Lifting Diary project. All contributors must follow these guidelines.

## Core Principles

1. **All mutations go through Server Actions** - No API routes, no client-side mutations
2. **Server Actions live in colocated `actions.ts` files** - Next to the page that uses them
3. **Data layer functions wrap all database calls** - In `/src/data/` directory
4. **Zod validates all inputs** - Every Server Action validates its parameters
5. **No FormData types** - Use typed parameters with Zod schemas

## Architecture Overview

```
src/
├── app/
│   └── dashboard/
│       ├── page.tsx        # Server Component (reads data)
│       └── actions.ts      # Server Actions (mutations)
├── data/
│   ├── workouts.ts         # Data layer (queries + mutations)
│   ├── exercises.ts
│   └── types.ts            # Shared types
└── db/
    ├── index.ts            # Database connection
    └── schema.ts           # Drizzle schema
```

## Data Layer Functions

### Location and Naming

All database mutation functions MUST be in `/src/data/`:

```typescript
// src/data/workouts.ts
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Mutation functions - always require userId for user-owned data
export async function createWorkout(
  userId: string,
  data: { name: string; date: string; notes?: string }
) {
  const [workout] = await db
    .insert(workouts)
    .values({
      userId,
      name: data.name,
      date: data.date,
      notes: data.notes ?? null,
    })
    .returning();

  return workout;
}

export async function updateWorkout(
  userId: string,
  workoutId: string,
  data: { name?: string; notes?: string }
) {
  const [workout] = await db
    .update(workouts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning();

  return workout ?? null;
}

export async function deleteWorkout(userId: string, workoutId: string) {
  const [deleted] = await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning({ id: workouts.id });

  return deleted ?? null;
}
```

### Function Requirements

| Requirement           | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `userId` parameter    | Required for all user-owned data mutations           |
| Filter by `userId`    | All UPDATE/DELETE queries must include userId filter |
| Use `.returning()`    | Return the mutated record for confirmation           |
| Use Drizzle ORM       | No raw SQL queries                                   |
| Single responsibility | One function per mutation type                       |

## Server Actions

### File Location

Server Actions MUST be in colocated `actions.ts` files next to the page that uses them:

```
src/app/dashboard/
├── page.tsx          # Uses actions from ./actions.ts
├── actions.ts        # Server Actions for this route
└── workout-form.tsx  # Client Component that calls actions
```

### Basic Structure

```typescript
// src/app/dashboard/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createWorkout, updateWorkout, deleteWorkout } from "@/data/workouts";

// Define Zod schemas for validation
const createWorkoutSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  notes: z.string().max(1000).optional(),
});

const updateWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(1000).optional(),
});

const deleteWorkoutSchema = z.object({
  workoutId: z.string().uuid(),
});

// Type inference from schemas
type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
type DeleteWorkoutInput = z.infer<typeof deleteWorkoutSchema>;

// Server Action implementations
export async function createWorkoutAction(input: CreateWorkoutInput) {
  // 1. Authenticate
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  // 2. Validate input
  const result = createWorkoutSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  // 3. Call data layer
  try {
    const workout = await createWorkout(userId, result.data);
    revalidatePath("/dashboard");
    return { data: workout };
  } catch (error) {
    console.error("Failed to create workout:", error);
    return { error: "Failed to create workout" };
  }
}

export async function updateWorkoutAction(input: UpdateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const result = updateWorkoutSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  try {
    const { workoutId, ...data } = result.data;
    const workout = await updateWorkout(userId, workoutId, data);

    if (!workout) {
      return { error: "Workout not found" };
    }

    revalidatePath("/dashboard");
    return { data: workout };
  } catch (error) {
    console.error("Failed to update workout:", error);
    return { error: "Failed to update workout" };
  }
}

export async function deleteWorkoutAction(input: DeleteWorkoutInput) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }

  const result = deleteWorkoutSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }

  try {
    const deleted = await deleteWorkout(userId, result.data.workoutId);

    if (!deleted) {
      return { error: "Workout not found" };
    }

    revalidatePath("/dashboard");
    return { data: { success: true } };
  } catch (error) {
    console.error("Failed to delete workout:", error);
    return { error: "Failed to delete workout" };
  }
}
```

### Server Action Requirements

| Requirement              | Description                                        |
| ------------------------ | -------------------------------------------------- |
| `"use server"` directive | Must be at the top of the file                     |
| Authentication first     | Always call `auth()` before any mutation           |
| Zod validation           | Validate all inputs with Zod schemas               |
| Typed parameters         | Use inferred types from Zod, NOT `FormData`        |
| Return objects           | Return `{ data }` or `{ error }` objects           |
| Call data layer          | Never access `db` directly in Server Actions       |
| Revalidate paths         | Call `revalidatePath()` after successful mutations |
| Error handling           | Wrap data layer calls in try/catch                 |

## Zod Schema Patterns

### Common Validations

```typescript
import { z } from "zod";

// String validations
const nameSchema = z.string().min(1).max(100).trim();
const notesSchema = z.string().max(1000).optional();

// Date format (YYYY-MM-DD)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// UUID
const uuidSchema = z.string().uuid();

// Numeric values
const weightSchema = z.number().positive().max(9999.99);
const repsSchema = z.number().int().positive().max(999);
const setNumberSchema = z.number().int().positive().max(100);

// Enum values
const muscleGroupSchema = z.enum([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "core",
]);
```

### Schema Composition

```typescript
// Base schemas for reuse
const workoutBaseSchema = z.object({
  name: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
});

// Create schema (all required fields)
const createWorkoutSchema = workoutBaseSchema;

// Update schema (all fields optional + id required)
const updateWorkoutSchema = workoutBaseSchema.partial().extend({
  workoutId: z.string().uuid(),
});

// Nested schemas
const createSetSchema = z.object({
  workoutExerciseId: z.string().uuid(),
  setNumber: z.number().int().positive(),
  weight: z.number().positive().optional(),
  reps: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});
```

### Custom Error Messages

```typescript
const createWorkoutSchema = z.object({
  name: z
    .string({ required_error: "Workout name is required" })
    .min(1, "Workout name cannot be empty")
    .max(100, "Workout name must be 100 characters or less"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  notes: z
    .string()
    .max(1000, "Notes must be 1000 characters or less")
    .optional(),
});
```

## Calling Server Actions from Client Components

### Basic Pattern

```typescript
// src/app/dashboard/workout-form.tsx
"use client";

import { useTransition } from "react";
import { createWorkoutAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WorkoutForm() {
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Convert FormData to typed object
    const input = {
      name: formData.get("name") as string,
      date: formData.get("date") as string,
      notes: (formData.get("notes") as string) || undefined,
    };

    startTransition(async () => {
      const result = await createWorkoutAction(input);

      if (result.error) {
        // Handle error (show toast, set form errors, etc.)
        console.error(result.error);
        return;
      }

      // Handle success
      console.log("Created:", result.data);
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input name="name" placeholder="Workout name" required />
      <Input name="date" type="date" required />
      <Input name="notes" placeholder="Notes (optional)" />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Workout"}
      </Button>
    </form>
  );
}
```

### With Form State

```typescript
"use client";

import { useState, useTransition } from "react";
import { updateWorkoutAction } from "./actions";

type FormErrors = {
  name?: string[];
  notes?: string[];
};

export function EditWorkoutForm({ workoutId }: { workoutId: string }) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateWorkoutAction({
        workoutId,
        name: formData.get("name") as string,
        notes: (formData.get("notes") as string) || undefined,
      });

      if (result.error && typeof result.error === "object") {
        setErrors(result.error as FormErrors);
        return;
      }

      // Success - form will be updated via revalidation
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Input name="name" />
        {errors.name && <p className="text-red-500">{errors.name[0]}</p>}
      </div>
      <Button type="submit" disabled={isPending}>
        Save
      </Button>
    </form>
  );
}
```

## Return Type Pattern

Standardize Server Action return types:

```typescript
// src/lib/action-types.ts
export type ActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string | Record<string, string[]> };
```

Usage:

```typescript
// src/app/dashboard/actions.ts
import type { ActionResult } from "@/lib/action-types";
import type { Workout } from "@/data/types";

export async function createWorkoutAction(
  input: CreateWorkoutInput
): Promise<ActionResult<Workout>> {
  // ... implementation
  return { data: workout };
  // or
  return { error: "Something went wrong" };
  // or
  return { error: { name: ["Name is required"] } };
}
```

## Checklist for Mutations

Before merging any mutation-related code, verify:

- [ ] Server Action is in a colocated `actions.ts` file
- [ ] `"use server"` directive is at the top of the file
- [ ] `auth()` is called and `userId` is verified before mutation
- [ ] All inputs are validated with Zod schemas
- [ ] Parameters use Zod-inferred types, NOT `FormData`
- [ ] Database calls go through data layer functions in `/src/data/`
- [ ] Data layer functions require and filter by `userId`
- [ ] `revalidatePath()` is called after successful mutations
- [ ] Errors are caught and returned, not thrown
- [ ] Return type follows `{ data } | { error }` pattern

## Anti-Patterns to Avoid

### 1. Using FormData Types

```typescript
// WRONG - FormData is untyped and error-prone
export async function createWorkout(formData: FormData) {
  const name = formData.get("name"); // unknown type, could be null
}

// CORRECT - Typed parameters with Zod validation
export async function createWorkout(input: CreateWorkoutInput) {
  const result = createWorkoutSchema.safeParse(input);
  // input.name is guaranteed to be a string after validation
}
```

### 2. Skipping Validation

```typescript
// WRONG - No validation, trusts client input
export async function createWorkout(input: { name: string; date: string }) {
  await db.insert(workouts).values(input);
}

// CORRECT - Validate everything
export async function createWorkout(input: CreateWorkoutInput) {
  const result = createWorkoutSchema.safeParse(input);
  if (!result.success) {
    return { error: result.error.flatten().fieldErrors };
  }
  // Use result.data which is validated
}
```

### 3. Direct Database Access in Server Actions

```typescript
// WRONG - Database access in Server Action
"use server";
import { db } from "@/db";

export async function createWorkout(input: CreateWorkoutInput) {
  await db.insert(workouts).values({ ...input, userId });
}

// CORRECT - Use data layer functions
("use server");
import { createWorkout } from "@/data/workouts";

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const workout = await createWorkout(userId, input);
}
```

### 4. Missing User Ownership Checks

```typescript
// WRONG - Deletes any workout by ID
export async function deleteWorkout(userId: string, workoutId: string) {
  await db.delete(workouts).where(eq(workouts.id, workoutId));
}

// CORRECT - Only deletes if user owns it
export async function deleteWorkout(userId: string, workoutId: string) {
  await db
    .delete(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
}
```

### 5. Throwing Errors Instead of Returning Them

```typescript
// WRONG - Throwing causes unhandled errors on client
export async function createWorkout(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized"); // Bad UX
  }
}

// CORRECT - Return error objects
export async function createWorkout(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) {
    return { error: "Unauthorized" };
  }
}
```

### 6. Actions in the Wrong Location

```typescript
// WRONG - Centralized actions file
// src/actions/index.ts
export async function createWorkout() {}
export async function createExercise() {}
export async function createSet() {}

// CORRECT - Colocated with page
// src/app/dashboard/actions.ts
export async function createWorkoutAction() {}

// src/app/exercises/actions.ts
export async function createExerciseAction() {}
```

### 7. Not Revalidating After Mutations

```typescript
// WRONG - UI won't update after mutation
export async function createWorkout(input: CreateWorkoutInput) {
  await createWorkout(userId, input);
  return { data: workout };
  // Missing revalidatePath!
}

// CORRECT - Revalidate affected paths
export async function createWorkout(input: CreateWorkoutInput) {
  const workout = await createWorkout(userId, input);
  revalidatePath("/dashboard");
  return { data: workout };
}
```

## Transaction Support

For mutations that span multiple tables, use Drizzle transactions:

```typescript
// src/data/workouts.ts
export async function createWorkoutWithExercises(
  userId: string,
  data: {
    name: string;
    date: string;
    exercises: {
      exerciseId: string;
      sets: { weight: number; reps: number }[];
    }[];
  }
) {
  return db.transaction(async (tx) => {
    // Create workout
    const [workout] = await tx
      .insert(workouts)
      .values({ userId, name: data.name, date: data.date })
      .returning();

    // Create workout exercises and sets
    for (let i = 0; i < data.exercises.length; i++) {
      const exercise = data.exercises[i];
      const [workoutExercise] = await tx
        .insert(workoutExercises)
        .values({
          workoutId: workout.id,
          exerciseId: exercise.exerciseId,
          order: i + 1,
        })
        .returning();

      for (let j = 0; j < exercise.sets.length; j++) {
        await tx.insert(sets).values({
          workoutExerciseId: workoutExercise.id,
          setNumber: j + 1,
          weight: exercise.sets[j].weight.toString(),
          reps: exercise.sets[j].reps,
        });
      }
    }

    return workout;
  });
}
```

## Resources

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Zod Documentation](https://zod.dev/)
- [Drizzle ORM Transactions](https://orm.drizzle.team/docs/transactions)

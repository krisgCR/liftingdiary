import { pgTable, uuid, text, date, timestamp, integer, numeric } from "drizzle-orm/pg-core";

// Exercise catalog - system defaults (user_id = null) and user-created exercises
export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  primaryMuscle: text("primary_muscle"),
  secondaryMuscles: text("secondary_muscles").array(),
  userId: text("user_id"), // null = system default, value = user-created
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Workout sessions tied to Clerk user
export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name"),
  date: date("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Junction table linking exercises to workouts
export const workoutExercises = pgTable("workout_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id")
    .notNull()
    .references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id")
    .notNull()
    .references(() => exercises.id, { onDelete: "restrict" }),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Individual sets for each workout exercise
export const sets = pgTable("sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutExerciseId: uuid("workout_exercise_id")
    .notNull()
    .references(() => workoutExercises.id, { onDelete: "cascade" }),
  setNumber: integer("set_number").notNull(),
  weight: numeric("weight", { precision: 7, scale: 2 }),
  reps: integer("reps").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

import { db } from "@/db";
import { workouts, workoutExercises, exercises, sets } from "@/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import type { WorkoutWithExercises, WorkoutSummary } from "./types";

type WorkoutRow = {
  workout: {
    id: string;
    name: string | null;
    date: string;
    notes: string | null;
  };
  workoutExercise: {
    id: string;
    order: number;
  } | null;
  exercise: {
    id: string;
    name: string;
    primaryMuscle: string | null;
  } | null;
  set: {
    id: string;
    setNumber: number;
    weight: string | null;
    reps: number;
    notes: string | null;
  } | null;
};

function transformToWorkoutWithExercises(
  rows: WorkoutRow[]
): WorkoutWithExercises[] {
  const workoutsMap = new Map<
    string,
    {
      workout: WorkoutRow["workout"];
      exercisesMap: Map<
        string,
        {
          workoutExercise: NonNullable<WorkoutRow["workoutExercise"]>;
          exercise: NonNullable<WorkoutRow["exercise"]>;
          sets: NonNullable<WorkoutRow["set"]>[];
        }
      >;
    }
  >();

  for (const row of rows) {
    // Get or create workout entry
    if (!workoutsMap.has(row.workout.id)) {
      workoutsMap.set(row.workout.id, {
        workout: row.workout,
        exercisesMap: new Map(),
      });
    }
    const workoutEntry = workoutsMap.get(row.workout.id)!;

    // Skip if no exercise (workout with no exercises)
    if (!row.workoutExercise || !row.exercise) {
      continue;
    }

    // Get or create exercise entry
    if (!workoutEntry.exercisesMap.has(row.workoutExercise.id)) {
      workoutEntry.exercisesMap.set(row.workoutExercise.id, {
        workoutExercise: row.workoutExercise,
        exercise: row.exercise,
        sets: [],
      });
    }
    const exerciseEntry = workoutEntry.exercisesMap.get(row.workoutExercise.id)!;

    // Add set if present
    if (row.set) {
      exerciseEntry.sets.push(row.set);
    }
  }

  // Transform map to array structure
  return Array.from(workoutsMap.values()).map(({ workout, exercisesMap }) => ({
    id: workout.id,
    name: workout.name,
    date: workout.date,
    notes: workout.notes,
    exercises: Array.from(exercisesMap.values())
      .sort((a, b) => a.workoutExercise.order - b.workoutExercise.order)
      .map(({ workoutExercise, exercise, sets }) => ({
        id: workoutExercise.id,
        order: workoutExercise.order,
        exercise: {
          id: exercise.id,
          name: exercise.name,
          primaryMuscle: exercise.primaryMuscle,
        },
        sets: sets.sort((a, b) => a.setNumber - b.setNumber),
      })),
  }));
}

export async function getWorkoutsByDate(
  userId: string,
  date: string
): Promise<WorkoutWithExercises[]> {
  const rows = await db
    .select({
      workout: {
        id: workouts.id,
        name: workouts.name,
        date: workouts.date,
        notes: workouts.notes,
      },
      workoutExercise: {
        id: workoutExercises.id,
        order: workoutExercises.order,
      },
      exercise: {
        id: exercises.id,
        name: exercises.name,
        primaryMuscle: exercises.primaryMuscle,
      },
      set: {
        id: sets.id,
        setNumber: sets.setNumber,
        weight: sets.weight,
        reps: sets.reps,
        notes: sets.notes,
      },
    })
    .from(workouts)
    .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
    .leftJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .leftJoin(sets, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(and(eq(workouts.userId, userId), eq(workouts.date, date)))
    .orderBy(workouts.id, workoutExercises.order, sets.setNumber);

  return transformToWorkoutWithExercises(rows);
}

export async function getWorkoutSummary(
  userId: string
): Promise<WorkoutSummary> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const [totalWorkoutsResult, recentWorkouts, exercisesResult, setsResult] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(workouts)
        .where(eq(workouts.userId, userId)),

      db
        .select({
          id: workouts.id,
          name: workouts.name,
          date: workouts.date,
        })
        .from(workouts)
        .where(eq(workouts.userId, userId))
        .orderBy(desc(workouts.date))
        .limit(5),

      db
        .select({ count: sql<number>`count(*)` })
        .from(workoutExercises)
        .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
        .where(
          and(eq(workouts.userId, userId), gte(workouts.date, thirtyDaysAgoStr))
        ),

      db
        .select({ count: sql<number>`count(*)` })
        .from(sets)
        .innerJoin(
          workoutExercises,
          eq(sets.workoutExerciseId, workoutExercises.id)
        )
        .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
        .where(
          and(eq(workouts.userId, userId), gte(workouts.date, thirtyDaysAgoStr))
        ),
    ]);

  return {
    totalWorkouts: Number(totalWorkoutsResult[0]?.count ?? 0),
    totalExercises: Number(exercisesResult[0]?.count ?? 0),
    totalSets: Number(setsResult[0]?.count ?? 0),
    recentWorkouts,
    lastWorkoutDate: recentWorkouts[0]?.date ?? null,
  };
}

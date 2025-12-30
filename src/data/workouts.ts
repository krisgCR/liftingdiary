import { db } from "@/db";
import { workouts, workoutExercises, exercises, sets } from "@/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import type { WorkoutWithExercises, WorkoutSummary } from "./types";

export async function getWorkoutsByDate(
  userId: string,
  date: string
): Promise<WorkoutWithExercises[]> {
  const userWorkouts = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.date, date)));

  if (userWorkouts.length === 0) {
    return [];
  }

  const result: WorkoutWithExercises[] = [];

  for (const workout of userWorkouts) {
    const workoutExercisesList = await db
      .select({
        id: workoutExercises.id,
        order: workoutExercises.order,
        exercise: {
          id: exercises.id,
          name: exercises.name,
          primaryMuscle: exercises.primaryMuscle,
        },
      })
      .from(workoutExercises)
      .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
      .where(eq(workoutExercises.workoutId, workout.id))
      .orderBy(workoutExercises.order);

    const exercisesWithSets = await Promise.all(
      workoutExercisesList.map(async (we) => {
        const exerciseSets = await db
          .select({
            id: sets.id,
            setNumber: sets.setNumber,
            weight: sets.weight,
            reps: sets.reps,
            notes: sets.notes,
          })
          .from(sets)
          .where(eq(sets.workoutExerciseId, we.id))
          .orderBy(sets.setNumber);

        return {
          id: we.id,
          order: we.order,
          exercise: we.exercise,
          sets: exerciseSets,
        };
      })
    );

    result.push({
      id: workout.id,
      name: workout.name,
      date: workout.date,
      notes: workout.notes,
      exercises: exercisesWithSets,
    });
  }

  return result;
}

export async function getWorkoutSummary(
  userId: string
): Promise<WorkoutSummary> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const totalWorkoutsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(eq(workouts.userId, userId));

  const totalWorkouts = Number(totalWorkoutsResult[0]?.count ?? 0);

  const recentWorkouts = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      date: workouts.date,
    })
    .from(workouts)
    .where(eq(workouts.userId, userId))
    .orderBy(desc(workouts.date))
    .limit(5);

  const exercisesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(eq(workouts.userId, userId), gte(workouts.date, thirtyDaysAgoStr))
    );

  const totalExercises = Number(exercisesResult[0]?.count ?? 0);

  const setsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(eq(workouts.userId, userId), gte(workouts.date, thirtyDaysAgoStr))
    );

  const totalSets = Number(setsResult[0]?.count ?? 0);

  const lastWorkoutDate =
    recentWorkouts.length > 0 ? recentWorkouts[0].date : null;

  return {
    totalWorkouts,
    totalExercises,
    totalSets,
    recentWorkouts,
    lastWorkoutDate,
  };
}

"use server";

import { db } from "@/db";
import { workouts, workoutExercises, exercises, sets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export type WorkoutWithExercises = {
  id: string;
  name: string | null;
  date: string;
  notes: string | null;
  exercises: {
    id: string;
    order: number;
    exercise: {
      id: string;
      name: string;
      primaryMuscle: string | null;
    };
    sets: {
      id: string;
      setNumber: number;
      weight: string | null;
      reps: number;
      notes: string | null;
    }[];
  }[];
};

export async function getWorkoutsByDate(date: string): Promise<WorkoutWithExercises[]> {
  const { userId } = await auth();

  if (!userId) {
    return [];
  }

  // Fetch workouts for the given date and user
  const userWorkouts = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.date, date)));

  if (userWorkouts.length === 0) {
    return [];
  }

  // Fetch workout exercises and sets for each workout
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

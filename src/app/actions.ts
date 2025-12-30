"use server";

import { db } from "@/db";
import { workouts, workoutExercises, sets } from "@/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export type WorkoutSummary = {
  totalWorkouts: number;
  totalExercises: number;
  totalSets: number;
  recentWorkouts: {
    id: string;
    name: string | null;
    date: string;
  }[];
  lastWorkoutDate: string | null;
};

export async function getWorkoutSummary(): Promise<WorkoutSummary | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  // Get date 30 days ago for "recent" stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  // Total workouts count (all time)
  const totalWorkoutsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(workouts)
    .where(eq(workouts.userId, userId));

  const totalWorkouts = Number(totalWorkoutsResult[0]?.count ?? 0);

  // Get recent workouts (last 5)
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

  // Total exercises in last 30 days
  const exercisesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(
      and(eq(workouts.userId, userId), gte(workouts.date, thirtyDaysAgoStr))
    );

  const totalExercises = Number(exercisesResult[0]?.count ?? 0);

  // Total sets in last 30 days
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

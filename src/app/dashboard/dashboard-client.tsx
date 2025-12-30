"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkoutsByDate, type WorkoutWithExercises } from "./actions";

export function DashboardClient() {
  const [date, setDate] = useState<Date>(new Date());
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkouts() {
      setLoading(true);
      const dateString = format(date, "yyyy-MM-dd");
      const data = await getWorkoutsByDate(dateString);
      setWorkouts(data);
      setLoading(false);
    }

    fetchWorkouts();
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label htmlFor="date-picker" className="text-sm font-medium">
          Select Date:
        </label>
        <DatePicker
          date={date}
          onDateChange={(newDate) => newDate && setDate(newDate)}
        />
      </div>

      <section aria-labelledby="workouts-heading" className="border-t pt-6">
        <h2 id="workouts-heading" className="text-lg font-semibold mb-4">
          Workouts for {format(date, "do MMM yyyy")}
        </h2>

        {loading ? (
          <WorkoutsSkeleton />
        ) : workouts.length === 0 ? (
          <p className="text-neutral-500 bg-neutral-50 rounded-lg p-6 text-center">
            No workouts logged for this date.
          </p>
        ) : (
          <div className="space-y-6">
            {workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WorkoutsSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading workouts">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WorkoutCard({ workout }: { workout: WorkoutWithExercises }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{workout.name || "Workout"}</CardTitle>
        {workout.notes && (
          <p className="text-sm text-muted-foreground">{workout.notes}</p>
        )}
      </CardHeader>
      <CardContent>
        {workout.exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exercises recorded.</p>
        ) : (
          <div className="space-y-4">
            {workout.exercises.map((we) => (
              <div key={we.id} className="border-t pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {we.order}.
                  </span>
                  <span className="font-medium">{we.exercise.name}</span>
                  {we.exercise.primaryMuscle && (
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {we.exercise.primaryMuscle}
                    </span>
                  )}
                </div>

                {we.sets.length > 0 && (
                  <div className="ml-4 sm:ml-6">
                    {/* Mobile: Card-based layout */}
                    <div className="block sm:hidden space-y-2">
                      {we.sets.map((set) => (
                        <div
                          key={set.id}
                          className="bg-muted rounded-md p-3 text-sm"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Set {set.setNumber}</span>
                            <span>
                              {set.weight ? `${set.weight} lbs` : "-"} × {set.reps} reps
                            </span>
                          </div>
                          {set.notes && (
                            <p className="text-muted-foreground text-xs mt-1">{set.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop: Table layout */}
                    <table className="hidden sm:table text-sm w-full">
                      <thead>
                        <tr className="text-muted-foreground text-left">
                          <th scope="col" className="py-1 pr-4 font-medium">Set</th>
                          <th scope="col" className="py-1 pr-4 font-medium">Weight</th>
                          <th scope="col" className="py-1 pr-4 font-medium">Reps</th>
                          <th scope="col" className="py-1 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {we.sets.map((set) => (
                          <tr key={set.id}>
                            <td className="py-1 pr-4">{set.setNumber}</td>
                            <td className="py-1 pr-4">
                              {set.weight ? `${set.weight} lbs` : "-"}
                            </td>
                            <td className="py-1 pr-4">{set.reps}</td>
                            <td className="py-1 text-muted-foreground">
                              {set.notes || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

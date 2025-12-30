import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getWorkoutsByDate } from "@/data/workouts";
import { DatePickerNav } from "./date-picker-nav";
import { WorkoutList } from "./workout-list";

interface DashboardPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  const { date } = await searchParams;
  const selectedDate = date || format(new Date(), "yyyy-MM-dd");
  const workouts = await getWorkoutsByDate(userId, selectedDate);

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Workout Dashboard</h1>
      <div className="space-y-6">
        <DatePickerNav currentDate={selectedDate} />
        <WorkoutList workouts={workouts} selectedDate={selectedDate} />
      </div>
    </main>
  );
}

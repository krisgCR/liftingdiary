import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getWorkoutSummary } from "./actions";

export default async function Home() {
  return (
    <main className="min-h-[calc(100vh-64px)]">
      <SignedOut>
        <HeroSection />
      </SignedOut>
      <SignedIn>
        <DashboardSummary />
      </SignedIn>
    </main>
  );
}

function HeroSection() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      {/* Hero */}
      <section className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mb-6">
          Track Your Lifting Journey
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Lifting Diary helps you log workouts, track progress, and stay
          consistent with your strength training goals.
        </p>
        <SignUpButton mode="modal">
          <Button size="lg" className="text-base px-8">
            Get Started Free
          </Button>
        </SignUpButton>
      </section>

      {/* Features */}
      <section aria-labelledby="features-heading" className="mb-16">
        <h2 id="features-heading" className="sr-only">
          Features
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Log Workouts"
            description="Quickly record exercises, sets, reps, and weights for every training session."
          />
          <FeatureCard
            title="Track Progress"
            description="View your workout history and see how your strength improves over time."
          />
          <FeatureCard
            title="Stay Organized"
            description="Keep all your training data in one place, accessible from any device."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="text-center bg-muted rounded-xl p-8 sm:p-12">
        <h2 className="text-2xl font-semibold mb-4">
          Ready to start your fitness journey?
        </h2>
        <p className="text-muted-foreground mb-6">
          Join Lifting Diary today and take control of your training.
        </p>
        <SignUpButton mode="modal">
          <Button variant="default" size="lg">
            Sign Up Now
          </Button>
        </SignUpButton>
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

async function DashboardSummary() {
  const summary = await getWorkoutSummary();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <section className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome Back!</h1>
        <p className="text-muted-foreground">
          Here is a quick overview of your training activity.
        </p>
      </section>

      {/* Stats Cards */}
      <section aria-labelledby="stats-heading" className="mb-8">
        <h2 id="stats-heading" className="sr-only">
          Workout Statistics
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Workouts"
            value={summary?.totalWorkouts ?? 0}
          />
          <StatCard
            label="Exercises (30 days)"
            value={summary?.totalExercises ?? 0}
          />
          <StatCard label="Sets (30 days)" value={summary?.totalSets ?? 0} />
        </div>
      </section>

      {/* Last Workout */}
      {summary?.lastWorkoutDate && (
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Last Workout</CardTitle>
              <CardDescription>
                {format(new Date(summary.lastWorkoutDate), "do MMM yyyy")}
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      )}

      {/* Recent Workouts List */}
      {summary && summary.recentWorkouts.length > 0 && (
        <section aria-labelledby="recent-heading" className="mb-8">
          <h2 id="recent-heading" className="text-lg font-semibold mb-4">
            Recent Workouts
          </h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="divide-y">
                {summary.recentWorkouts.map((workout) => (
                  <li
                    key={workout.id}
                    className="py-3 first:pt-0 last:pb-0 flex justify-between items-center"
                  >
                    <span className="font-medium">
                      {workout.name || "Workout"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(workout.date), "do MMM yyyy")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* CTA to Dashboard */}
      <section className="text-center">
        <Button asChild size="lg">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

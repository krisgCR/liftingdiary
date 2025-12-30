"use client";

import { useRouter } from "next/navigation";
import { format, parse } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";

interface DatePickerNavProps {
  currentDate: string;
}

export function DatePickerNav({ currentDate }: DatePickerNavProps) {
  const router = useRouter();
  const date = parse(currentDate, "yyyy-MM-dd", new Date());

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      const dateString = format(newDate, "yyyy-MM-dd");
      router.push(`/dashboard?date=${dateString}`);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <label htmlFor="date-picker" className="text-sm font-medium">
        Select Date:
      </label>
      <DatePicker date={date} onDateChange={handleDateChange} />
    </div>
  );
}

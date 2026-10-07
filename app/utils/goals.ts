import { z } from "zod";

export const dailyGoalsSchema = z.object({
  calories: z.number("Enter a calorie goal").int("Use a whole number").positive("Calories must be greater than zero"),
  protein: z.number("Enter a protein goal").int("Use a whole number").positive("Protein must be greater than zero"),
});

export type DailyGoals = z.output<typeof dailyGoalsSchema>;

export const defaultDailyGoals: DailyGoals = { calories: 2_000, protein: 150 };

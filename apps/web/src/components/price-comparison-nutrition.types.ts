export interface NutritionInfoRow {
  label: string;
  per100g: string | null;
  perServing: string | null;
  perDailyServing?: string | null;
  referenceIntake?: string | null;
}

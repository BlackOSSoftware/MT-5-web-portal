export type CalendarImpact = "high" | "medium" | "low" | "other";

export type CalendarEvent = {
  id: string;
  title: string;
  /** ISO currency the release affects, e.g. "USD". */
  currency: string;
  /** Country / region code derived from the currency, e.g. "US", "EU". */
  country: string;
  /** Release time as an ISO string (UTC). */
  date: string;
  impact: CalendarImpact;
  actual: string;
  forecast: string;
  previous: string;
};

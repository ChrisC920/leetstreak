export type Difficulty = "easy" | "medium" | "hard";

export interface Weights {
  easy: number;
  medium: number;
  hard: number;
}

export interface ProblemRef {
  id: string;
  difficulty: Difficulty;
}

export type DayStatus = "pending" | "complete" | "frozen" | "missed" | "repaired";

export const MAX_FREEZES = 2;
export const FREEZE_EARN_INTERVAL = 7; // earn 1 freeze per 7-day streak
export const REPAIR_WINDOW_DAYS = 3; // days after a miss to clear backlog

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

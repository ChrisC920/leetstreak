"use client";

import Link from "next/link";
import { useState } from "react";
import { DayStrip, type DayCell } from "@/components/day-heatmap";

export interface LeaderboardRow {
  user_id: string;
  username: string;
  streak_current: number;
  streak_longest: number;
  freezes: number;
  weight: number;
  solved: number | null;
  cells: DayCell[];
}

type SortKey = "streak_current" | "streak_longest" | "weight" | "solved";

const COLUMNS: [SortKey, string][] = [
  ["streak_current", "🔥 Streak"],
  ["streak_longest", "Best"],
  ["weight", "Weight (7d)"],
  ["solved", "Solved"],
];

export function Leaderboard({
  rows,
  groupId,
  leaderId,
  stripDays,
}: {
  rows: LeaderboardRow[];
  groupId: string;
  leaderId: string;
  stripDays: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("streak_current");
  const sorted = [...rows].sort((a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1));

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="pb-2 font-medium">Member</th>
          {COLUMNS.map(([key, label]) => (
            <th key={key} className="pb-2 font-medium">
              <button
                type="button"
                onClick={() => setSortKey(key)}
                className={`hover:text-foreground ${sortKey === key ? "text-foreground" : ""}`}
              >
                {label}
                {sortKey === key && " ↓"}
              </button>
            </th>
          ))}
          <th className="pb-2 font-medium">🧊</th>
          <th className="pb-2 font-medium">Last {stripDays} days</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((m) => (
          <tr key={m.user_id} className="border-t">
            <td className="py-2 font-medium">
              <Link href={`/groups/${groupId}/member/${m.user_id}`} className="hover:underline">
                {m.username}
              </Link>
              {m.user_id === leaderId && (
                <span className="ml-1 text-xs text-muted-foreground">(leader)</span>
              )}
            </td>
            <td className="py-2">{m.streak_current}</td>
            <td className="py-2">{m.streak_longest}</td>
            <td className="py-2">{m.weight}</td>
            <td className="py-2">{m.solved ?? "—"}</td>
            <td className="py-2">{m.freezes}</td>
            <td className="py-2">
              <DayStrip cells={m.cells} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

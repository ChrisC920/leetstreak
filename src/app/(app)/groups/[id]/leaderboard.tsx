"use client";

import { ArrowDown, Crown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DayStrip, type DayCell } from "@/components/day-heatmap";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Member</TableHead>
          {COLUMNS.map(([key, label]) => (
            <TableHead key={key}>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSortKey(key)}
                className={`-ml-2 gap-1 ${sortKey === key ? "text-foreground" : "text-muted-foreground"}`}
              >
                {label}
                {sortKey === key && <ArrowDown className="size-3" aria-hidden />}
              </Button>
            </TableHead>
          ))}
          <TableHead>🧊</TableHead>
          <TableHead>Last {stripDays} days</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((m) => (
          <TableRow key={m.user_id}>
            <TableCell className="font-medium">
              <Link
                href={`/groups/${groupId}/member/${m.user_id}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Avatar className="size-6">
                  <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary uppercase">
                    {m.username.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {m.username}
                {m.user_id === leaderId && (
                  <Crown className="size-3.5 text-primary" aria-label="group leader" />
                )}
              </Link>
            </TableCell>
            <TableCell className="font-mono tabular-nums">{m.streak_current}</TableCell>
            <TableCell className="font-mono tabular-nums">{m.streak_longest}</TableCell>
            <TableCell className="font-mono tabular-nums">{m.weight}</TableCell>
            <TableCell className="font-mono tabular-nums">{m.solved ?? "—"}</TableCell>
            <TableCell className="font-mono tabular-nums">{m.freezes}</TableCell>
            <TableCell>
              <DayStrip cells={m.cells} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

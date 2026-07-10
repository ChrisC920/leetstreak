"use client";

import { ArrowDown, Crown, Flame, Plus, Snowflake, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { grantFreeze } from "../actions";

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

const COLUMNS: [SortKey, string, LucideIcon | null][] = [
  ["streak_current", "Streak", Flame],
  ["streak_longest", "Best", null],
  ["weight", "Weight (7d)", null],
  ["solved", "Solved", null],
];

export function Leaderboard({
  rows,
  groupId,
  leaderId,
  stripDays,
  maxDayWeight = 0,
  isLeader,
}: {
  rows: LeaderboardRow[];
  groupId: string;
  leaderId: string;
  stripDays: number;
  maxDayWeight?: number;
  isLeader?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("streak_current");
  const [granting, startTransition] = useTransition();
  const sorted = [...rows].sort((a, b) => (b[sortKey] ?? -1) - (a[sortKey] ?? -1));

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-8">#</TableHead>
          <TableHead>Member</TableHead>
          {COLUMNS.map(([key, label, Icon]) => (
            <TableHead key={key}>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSortKey(key)}
                className={`-ml-2 gap-1 ${sortKey === key ? "text-foreground" : "text-muted-foreground"}`}
              >
                {Icon && <Icon className="size-3.5 text-orange-500" aria-hidden />}
                {label}
                {sortKey === key && <ArrowDown className="size-3" aria-hidden />}
              </Button>
            </TableHead>
          ))}
          <TableHead>
            <span className="flex items-center gap-1">
              <Snowflake className="size-3.5 text-sky-400" aria-hidden />
              Freezes
            </span>
          </TableHead>
          <TableHead>Last {stripDays} days</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((m, rank) => (
          <TableRow key={m.user_id}>
            <TableCell
              className={`font-mono tabular-nums ${
                rank === 0 ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              {rank + 1}
            </TableCell>
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
            <TableCell className="tabular-nums">
              <span className="flex items-center gap-1">
                {m.freezes}
                {isLeader && (
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={granting}
                    title="Give a freeze"
                    onClick={() =>
                      startTransition(async () => {
                        const { error } = await grantFreeze(groupId, m.user_id);
                        if (error) toast.error(error);
                        else toast.success(`Gave ${m.username} a freeze`);
                      })
                    }
                  >
                    <Plus className="size-3" aria-hidden />
                    <Snowflake className="size-3.5 text-sky-400" aria-hidden />
                  </Button>
                )}
              </span>
            </TableCell>
            <TableCell>
              <DayStrip cells={m.cells} maxWeight={maxDayWeight} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

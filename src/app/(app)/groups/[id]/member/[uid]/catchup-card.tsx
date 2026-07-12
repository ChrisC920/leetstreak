"use client";

import { CalendarPlus } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { assignCatchup } from "../../../actions";

export function CatchupCard({
  groupId,
  userId,
  username,
  assignableDates,
  pendingCatchups,
}: {
  groupId: string;
  userId: string;
  username: string;
  assignableDates: string[];
  pendingCatchups: { date: string; deadline: string }[];
}) {
  const [assigning, startTransition] = useTransition();
  if (assignableDates.length === 0 && pendingCatchups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarPlus className="size-4 text-primary" aria-hidden />
          Catch-up days
        </CardTitle>
        <CardDescription>
          Assign a day&apos;s problems that {username} missed before joining. Completing them
          counts that day as done on time.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {pendingCatchups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingCatchups.map((c) => (
              <Badge key={c.date} variant="secondary" className="font-mono tabular-nums">
                {c.date} · due {c.deadline}
              </Badge>
            ))}
          </div>
        )}
        {assignableDates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {assignableDates.map((date) => (
              <Button
                key={date}
                variant="outline"
                size="sm"
                disabled={assigning}
                className="font-mono tabular-nums"
                onClick={() =>
                  startTransition(async () => {
                    const { error } = await assignCatchup(groupId, userId, date);
                    if (error) toast.error(error);
                    else toast.success(`Assigned ${date} to ${username}`);
                  })
                }
              >
                <CalendarPlus className="size-3.5" aria-hidden />
                {date}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

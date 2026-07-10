"use client";

import { LogOut } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { leaveGroup } from "../actions";

export function LeaveButton({
  groupId,
  groupName,
  description = "Your streak and history in this group will be deleted. This can't be undone.",
}: {
  groupId: string;
  groupName: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [leaving, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" />}
      >
        <LogOut className="size-3.5" aria-hidden />
        Leave
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave {groupName}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={leaving}
            onClick={() =>
              startTransition(async () => {
                const result = await leaveGroup(groupId);
                if (result?.error) toast.error(result.error);
              })
            }
          >
            Leave group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

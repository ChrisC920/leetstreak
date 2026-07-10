"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JoinForm } from "./join-form";

export function JoinDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Join with code</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
          <DialogDescription>Paste the invite code a friend shared with you.</DialogDescription>
        </DialogHeader>
        <JoinForm />
      </DialogContent>
    </Dialog>
  );
}

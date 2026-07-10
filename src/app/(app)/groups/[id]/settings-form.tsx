"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateGroup, type GroupFormState } from "../actions";

interface GroupSettings {
  id: string;
  name: string;
  mode: string;
  daily_target_weight: number;
  weight_easy: number;
  weight_medium: number;
  weight_hard: number;
}

export function SettingsForm({ group }: { group: GroupSettings }) {
  const action = updateGroup.bind(null, group.id);
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(action, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Group name</Label>
        <Input id="name" name="name" defaultValue={group.name} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="mode">Order</Label>
        <Select name="mode" defaultValue={group.mode}>
          <SelectTrigger id="mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ordered">Playlist order</SelectItem>
            <SelectItem value="random">Random each day</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="daily_target_weight">Daily weight target</Label>
        <Input
          id="daily_target_weight"
          name="daily_target_weight"
          type="number"
          min={1}
          max={30}
          defaultValue={group.daily_target_weight}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["weight_easy", "Easy", group.weight_easy],
            ["weight_medium", "Medium", group.weight_medium],
            ["weight_hard", "Hard", group.weight_hard],
          ] as const
        ).map(([name, label, def]) => (
          <div key={name} className="flex flex-col gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} type="number" min={1} max={10} defaultValue={def} />
          </div>
        ))}
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Changes apply from tomorrow&apos;s assignment.
      </p>
    </form>
  );
}

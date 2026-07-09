"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroup, type GroupFormState } from "../actions";

interface Playlist {
  id: string;
  name: string;
}

export function CreateGroupForm({ playlists }: { playlists: Playlist[] }) {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(createGroup, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Group name</Label>
        <Input id="name" name="name" required placeholder="grind squad" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="playlist_id">Playlist</Label>
        <select
          id="playlist_id"
          name="playlist_id"
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          {playlists.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="mode">Order</Label>
        <select
          id="mode"
          name="mode"
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="ordered">Playlist order</option>
          <option value="random">Random each day</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="daily_target_weight">Daily weight target</Label>
        <Input
          id="daily_target_weight"
          name="daily_target_weight"
          type="number"
          min={1}
          max={30}
          defaultValue={3}
        />
        <p className="text-xs text-muted-foreground">
          Problems are assigned until their weights add up to this. Defaults: easy 1 · medium 2 ·
          hard 4.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["weight_easy", "Easy", 1],
            ["weight_medium", "Medium", 2],
            ["weight_hard", "Hard", 4],
          ] as const
        ).map(([name, label, def]) => (
          <div key={name} className="flex flex-col gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} type="number" min={1} max={10} defaultValue={def} />
          </div>
        ))}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create group"}
      </Button>
    </form>
  );
}

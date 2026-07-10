"use client";

import { ArrowDownWideNarrow, Shuffle } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { createGroup, type GroupFormState } from "../actions";

interface Playlist {
  id: string;
  name: string;
}

const MODES = [
  {
    value: "ordered",
    label: "Playlist order",
    hint: "Everyone works through the list front to back.",
    icon: ArrowDownWideNarrow,
  },
  {
    value: "random",
    label: "Random each day",
    hint: "A fresh surprise pick every morning.",
    icon: Shuffle,
  },
] as const;

export function CreateGroupForm({ playlists }: { playlists: Playlist[] }) {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(createGroup, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Group name</Label>
        <Input id="name" name="name" required placeholder="grind squad" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="playlist_id">Playlist</Label>
        <Select name="playlist_id" defaultValue={playlists[0]?.id}>
          <SelectTrigger id="playlist_id" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {playlists.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Order</legend>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(({ value, label, hint, icon: Icon }) => (
            <label
              key={value}
              className="flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3 transition-colors hover:bg-accent has-checked:border-primary has-checked:bg-primary/5"
            >
              <input
                type="radio"
                name="mode"
                value={value}
                defaultChecked={value === "ordered"}
                className="sr-only"
              />
              <span className="flex items-center gap-2 text-sm font-medium">
                <Icon className="size-4 text-primary" aria-hidden />
                {label}
              </span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Separator />
      <p className="text-sm font-medium">Daily workload</p>

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

      <Separator />
      <p className="text-sm font-medium">Streak policy</p>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["grace_period_days", "Grace period (days)", 3, 0, 14],
            ["freeze_earn_interval", "Freeze every (days)", 7, 1, 30],
            ["max_freezes", "Max freezes", 2, 0, 10],
          ] as const
        ).map(([name, label, def, min, max]) => (
          <div key={name} className="flex flex-col gap-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} type="number" min={min} max={max} defaultValue={def} />
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

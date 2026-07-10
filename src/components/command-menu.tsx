"use client";

import {
  BarChart3,
  Flame,
  Moon,
  Plus,
  RefreshCw,
  Sun,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { syncNow } from "@/app/(app)/dashboard/actions";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [, startTransition] = useTransition();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function run(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => run(() => router.push("/dashboard"))}>
            <Flame /> Today
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/groups"))}>
            <Users /> Groups
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/stats"))}>
            <BarChart3 /> Stats
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() =>
              run(() =>
                startTransition(async () => {
                  await syncNow();
                  toast.success("Synced with LeetCode");
                }),
              )
            }
          >
            <RefreshCw /> Sync with LeetCode
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/groups/new"))}>
            <Plus /> Create group
          </CommandItem>
          <CommandItem
            onSelect={() =>
              run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
            }
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />} Toggle theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

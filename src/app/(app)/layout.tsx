import { Flame } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { serverClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  async function signOut() {
    "use server";
    const supabase = await serverClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/dashboard" className="flex items-center gap-1 font-bold">
              <span>
                leet<span className="text-primary">streak</span>
              </span>
              <Flame className="flame-pulse size-4 text-orange-500" aria-hidden />
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Account menu" />
                }
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary uppercase">
                    {profile.username.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{profile.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action={signOut}>
                  <DropdownMenuItem
                    render={<button type="submit" className="w-full" />}
                  >
                    Sign out
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">{children}</main>
    </div>
  );
}

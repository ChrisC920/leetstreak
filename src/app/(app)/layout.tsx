import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authedUserId, serverClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await serverClient();
  const userId = await authedUserId(supabase);
  if (!userId) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) redirect("/onboarding");

  async function signOut() {
    "use server";
    const supabase = await serverClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <SidebarProvider>
      <AppSidebar username={profile.username} signOut={signOut} />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur">
          <SidebarTrigger />
          <div className="flex-1" />
          <kbd className="pointer-events-none hidden items-center gap-1 rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground select-none sm:inline-flex">
            ⌘K
          </kbd>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          {children}
        </main>
        <CommandMenu />
      </SidebarInset>
    </SidebarProvider>
  );
}

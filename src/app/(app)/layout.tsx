import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
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
      <header className="border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold">
              leet<span className="text-orange-500">streak</span>
            </Link>
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Today
            </Link>
            <Link href="/groups" className="text-sm text-muted-foreground hover:text-foreground">
              Groups
            </Link>
            <Link href="/stats" className="text-sm text-muted-foreground hover:text-foreground">
              Stats
            </Link>
          </nav>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out · {profile.username}
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl p-4">{children}</main>
    </div>
  );
}

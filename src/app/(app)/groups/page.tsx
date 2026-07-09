import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverClient } from "@/lib/supabase/server";
import { JoinForm } from "./join-form";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: memberships } = await supabase
    .from("group_members")
    .select("streak_current, groups(id, name, mode, daily_target_weight, playlists(name))")
    .eq("user_id", user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your groups</h1>
        <Button render={<Link href="/groups/new" />}>Create a group</Button>
      </div>

      {(memberships ?? []).length === 0 ? (
        <p className="text-muted-foreground">You&apos;re not in any group yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(memberships ?? []).map((m) => {
            const g = m.groups as unknown as {
              id: string;
              name: string;
              mode: string;
              daily_target_weight: number;
              playlists: { name: string };
            };
            return (
              <Link key={g.id} href={`/groups/${g.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{g.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {g.playlists.name} · {g.mode} · {g.daily_target_weight} weight/day · 🔥{" "}
                    {m.streak_current}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Join with an invite code</CardTitle>
        </CardHeader>
        <CardContent>
          <JoinForm />
        </CardContent>
      </Card>
    </div>
  );
}

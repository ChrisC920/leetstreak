import { Flame, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverClient } from "@/lib/supabase/server";
import { JoinDialog } from "./join-dialog";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Your groups</h1>
        <div className="flex items-center gap-2">
          <JoinDialog />
          <Button render={<Link href="/groups/new" />}>Create a group</Button>
        </div>
      </div>

      {(memberships ?? []).length === 0 ? (
        <BlurFade>
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
            <Users className="size-10 text-primary" aria-hidden />
            <p className="font-medium">You&apos;re not in any group yet.</p>
            <p className="text-sm text-muted-foreground">
              Create one and invite friends, or join with an invite code.
            </p>
          </div>
        </BlurFade>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(memberships ?? []).map((m, i) => {
            const g = m.groups as unknown as {
              id: string;
              name: string;
              mode: string;
              daily_target_weight: number;
              playlists: { name: string };
            };
            return (
              <BlurFade key={g.id} delay={0.05 * i}>
                <Link href={`/groups/${g.id}`} className="block h-full">
                  <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">{g.name}</CardTitle>
                      <span className="flex items-center gap-1 font-mono text-lg font-semibold">
                        <Flame className="size-5 text-orange-500" aria-hidden />
                        {m.streak_current}
                      </span>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{g.playlists.name}</Badge>
                      <Badge variant="secondary">{g.mode}</Badge>
                      <Badge variant="secondary">{g.daily_target_weight} weight/day</Badge>
                    </CardContent>
                  </Card>
                </Link>
              </BlurFade>
            );
          })}
        </div>
      )}
    </div>
  );
}

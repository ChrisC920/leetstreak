import { Flame, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { localDate } from "@/lib/core/dates";
import { serverClient } from "@/lib/supabase/server";
import { JoinDialog } from "./join-dialog";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
      .from("group_members")
      .select("streak_current, groups(id, name, mode, daily_target_weight, playlists(name))")
      .eq("user_id", user.id),
    supabase.from("profiles").select("timezone").eq("id", user.id).single(),
  ]);

  const groupIds = (memberships ?? []).map(
    (m) => (m.groups as unknown as { id: string }).id,
  );
  const today = localDate(new Date(), profile?.timezone ?? "UTC");

  // roster + today's status for member dots (RLS scopes to my groups)
  const [{ data: roster }, { data: todayDays }] = groupIds.length
    ? await Promise.all([
        supabase
          .from("group_members")
          .select("group_id, user_id, profiles(username)")
          .in("group_id", groupIds),
        supabase
          .from("member_days")
          .select("group_id, user_id, status")
          .in("group_id", groupIds)
          .eq("date", today),
      ])
    : [{ data: [] }, { data: [] }];

  const doneToday = new Set(
    (todayDays ?? [])
      .filter((d) => d.status === "complete" || d.status === "repaired")
      .map((d) => `${d.group_id}:${d.user_id}`),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your groups"
        description="Shared streaks with friends — everyone keeps everyone honest."
        actions={
          <>
            <JoinDialog />
            <Button render={<Link href="/groups/new" />}>Create a group</Button>
          </>
        }
      />

      {(memberships ?? []).length === 0 ? (
        <BlurFade>
          <EmptyState
            icon={Users}
            title="You're not in any group yet"
            description="Create one and invite friends, or join with an invite code."
            className="mx-auto max-w-md"
          />
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
            const members = (roster ?? []).filter((r) => r.group_id === g.id);
            const doneCount = members.filter((r) =>
              doneToday.has(`${g.id}:${r.user_id}`),
            ).length;
            return (
              <BlurFade key={g.id} delay={0.05 * i}>
                <Link href={`/groups/${g.id}`} className="block h-full">
                  <MagicCard className="h-full rounded-xl border transition-transform duration-200 hover:-translate-y-0.5">
                    <div className="flex h-full flex-col gap-4 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="truncate text-lg font-semibold tracking-tight">
                          {g.name}
                        </h2>
                        <span className="flex items-center gap-1 font-mono text-lg font-semibold tabular-nums">
                          <Flame className="size-5 text-amber-500" aria-hidden />
                          {m.streak_current}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex -space-x-2">
                          {members.slice(0, 5).map((r) => {
                            const name =
                              (r.profiles as unknown as { username: string })?.username ?? "?";
                            const done = doneToday.has(`${g.id}:${r.user_id}`);
                            return (
                              <Avatar
                                key={r.user_id}
                                className={`size-7 ring-2 ${
                                  done ? "ring-primary" : "ring-background"
                                }`}
                                title={`${name}${done ? " — done today" : ""}`}
                              >
                                <AvatarFallback className="bg-muted text-[10px] font-semibold uppercase">
                                  {name.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })}
                          {members.length > 5 && (
                            <span className="z-10 flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background">
                              +{members.length - 5}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {doneCount}/{members.length} done today
                        </span>
                      </div>
                      <div className="mt-auto flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{g.playlists.name}</Badge>
                        <Badge variant="secondary">{g.mode}</Badge>
                        <Badge variant="secondary">{g.daily_target_weight} weight/day</Badge>
                      </div>
                    </div>
                  </MagicCard>
                </Link>
              </BlurFade>
            );
          })}
        </div>
      )}
    </div>
  );
}

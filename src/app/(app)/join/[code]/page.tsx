import { Link2Off } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { runSettle } from "@/lib/jobs/settle";
import { serverClient } from "@/lib/supabase/server";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await serverClient();
  const { data: groupId, error } = await supabase.rpc("join_group", { code });
  if (error || !groupId) {
    return (
      <BlurFade>
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Link2Off className="size-10 text-muted-foreground" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight">Invalid invite link</h1>
            <p className="text-muted-foreground">Ask your friend for a fresh invite code.</p>
            <Button variant="outline" render={<Link href="/groups" />}>
              Back to groups
            </Button>
          </CardContent>
        </Card>
      </BlurFade>
    );
  }
  await runSettle();
  redirect(`/groups/${groupId}`);
}

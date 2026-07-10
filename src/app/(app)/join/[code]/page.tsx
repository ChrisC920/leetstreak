import { Link2Off } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { runSettle } from "@/lib/jobs/settle";
import { serverClient } from "@/lib/supabase/server";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await serverClient();
  const { data: groupId, error } = await supabase.rpc("join_group", { code });
  if (error || !groupId) {
    return (
      <BlurFade>
        <EmptyState
          icon={Link2Off}
          title="Invalid invite link"
          description="Ask your friend for a fresh invite code."
          className="mx-auto max-w-md"
        >
          <Button variant="outline" render={<Link href="/groups" />}>
            Back to groups
          </Button>
        </EmptyState>
      </BlurFade>
    );
  }
  await runSettle();
  redirect(`/groups/${groupId}`);
}

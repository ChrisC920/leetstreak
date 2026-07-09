import { redirect } from "next/navigation";
import { runSettle } from "@/lib/jobs/settle";
import { serverClient } from "@/lib/supabase/server";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await serverClient();
  const { data: groupId, error } = await supabase.rpc("join_group", { code });
  if (error || !groupId) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Invalid invite link</h1>
        <p className="mt-2 text-muted-foreground">Ask your friend for a fresh invite code.</p>
      </div>
    );
  }
  await runSettle();
  redirect(`/groups/${groupId}`);
}

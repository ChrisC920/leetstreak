import { serverClient } from "@/lib/supabase/server";
import { CreateGroupForm } from "./create-form";

export default async function NewGroupPage() {
  const supabase = await serverClient();
  const { data: playlists } = await supabase.from("playlists").select("id, name").order("name");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Create a group</h1>
      <CreateGroupForm playlists={playlists ?? []} />
    </div>
  );
}

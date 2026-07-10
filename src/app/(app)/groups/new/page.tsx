import { BlurFade } from "@/components/ui/blur-fade";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { serverClient } from "@/lib/supabase/server";
import { CreateGroupForm } from "./create-form";

export default async function NewGroupPage() {
  const supabase = await serverClient();
  const { data: playlists } = await supabase.from("playlists").select("id, name").order("name");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Create a group</h1>
      <BlurFade>
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="text-base">Group setup</CardTitle>
            <CardDescription>
              Pick a playlist and daily target — invite friends after creating.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGroupForm playlists={playlists ?? []} />
          </CardContent>
        </Card>
      </BlurFade>
    </div>
  );
}

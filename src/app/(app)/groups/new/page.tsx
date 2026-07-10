import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { BlurFade } from "@/components/ui/blur-fade";
import { serverClient } from "@/lib/supabase/server";
import { CreateGroupForm } from "./create-form";

export default async function NewGroupPage() {
  const supabase = await serverClient();
  const { data: playlists } = await supabase.from("playlists").select("id, name").order("name");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create a group"
        description="Pick a playlist and daily target — invite friends after creating."
      />
      <BlurFade>
        <SectionCard title="Group setup" className="max-w-lg">
          <CreateGroupForm playlists={playlists ?? []} />
        </SectionCard>
      </BlurFade>
    </div>
  );
}

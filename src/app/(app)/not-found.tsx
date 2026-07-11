import { SearchX } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <BlurFade>
      <EmptyState
        icon={SearchX}
        title="Not found"
        description="This page doesn't exist anymore. The group may have been deleted, or you're no longer a member."
        className="mx-auto max-w-md"
      >
        <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
        <Button variant="outline" render={<Link href="/groups" />}>
          Your groups
        </Button>
      </EmptyState>
    </BlurFade>
  );
}

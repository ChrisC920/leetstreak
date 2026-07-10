import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** CTA slot, e.g. buttons. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="size-5 text-primary" aria-hidden />
        </div>
        <div>
          <p className="font-medium">{title}</p>
          {description && (
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
      </CardContent>
    </Card>
  );
}

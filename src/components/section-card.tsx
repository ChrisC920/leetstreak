import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  action,
  children,
  className,
  contentClassName,
}: {
  title: React.ReactNode;
  /** Right-aligned slot in the header row (button, badge, legend…). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-5 w-96" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

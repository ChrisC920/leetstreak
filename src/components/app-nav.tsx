"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/groups", label: "Groups" },
  { href: "/stats", label: "Stats" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative rounded-md px-2 py-1.5 text-sm transition-colors sm:px-3",
              active
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {active && (
              <span className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

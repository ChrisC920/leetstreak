"use client";

import { BarChart3, Flame, LogOut, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const LINKS = [
  { href: "/dashboard", label: "Today", icon: Flame },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

export function AppSidebar({
  username,
  signOut,
}: {
  username: string;
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                <Flame className="flame-pulse size-4 text-primary" aria-hidden />
              </span>
              <span className="truncate text-base font-semibold tracking-tight">
                leet<span className="text-primary">streak</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {LINKS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(href)}
                    tooltip={label}
                    render={<Link href={href} />}
                  >
                    <Icon aria-hidden />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary uppercase">
              {username.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-sm group-data-[collapsible=icon]:hidden">
            {username}
          </span>
          <span className="group-data-[collapsible=icon]:hidden">
            <ThemeToggle />
          </span>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

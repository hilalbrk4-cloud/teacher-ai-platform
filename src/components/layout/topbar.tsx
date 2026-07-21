"use client";

import * as React from "react";
import { Bell, HelpCircle, Menu } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "@/lib/i18n/locale-provider";
import { teacherProfile } from "@/lib/mock-data";
import { SidebarBrand, SidebarNav } from "@/components/layout/sidebar";

const UNREAD_NOTIFICATIONS = 3;

export function Topbar() {
  const t = useTranslations();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label={t.topbar.openNavigation}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">{t.topbar.navigationTitle}</SheetTitle>
          <div className="flex h-full flex-col py-2">
            <SidebarBrand />
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" aria-label={t.topbar.notifications} className="relative" />}
          >
            <Bell className="size-5" aria-hidden="true" />
            {UNREAD_NOTIFICATIONS > 0 ? (
              <Badge className="absolute -top-1 -right-1 h-4.5 min-w-4.5 justify-center rounded-full px-1 text-[10px] leading-none">
                {UNREAD_NOTIFICATIONS}
              </Badge>
            ) : null}
          </TooltipTrigger>
          <TooltipContent>{t.topbar.notifications}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={t.topbar.help} />}>
            <HelpCircle className="size-5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{t.topbar.help}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-2 h-6" />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="gap-2 px-2" />}>
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {teacherProfile.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{teacherProfile.name}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{teacherProfile.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{teacherProfile.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{t.topbar.profile}</DropdownMenuItem>
            <DropdownMenuItem>{t.topbar.accountSettings}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">{t.topbar.logout}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

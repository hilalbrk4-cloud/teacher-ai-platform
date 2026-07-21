"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { useTranslations } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { primaryNavItems } from "@/lib/mock-data";

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {primaryNavItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/65 transition-colors duration-150",
              "hover:bg-sidebar-accent hover:text-sidebar-foreground",
              active && "bg-sidebar-accent text-white ring-1 ring-inset ring-white/5"
            )}
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              <Icon
                className={cn(
                  "size-4.5 transition-transform duration-200 group-hover:scale-110",
                  active && "text-primary"
                )}
                aria-hidden="true"
              />
            </span>
            <span>{t.nav[item.key]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  const t = useTranslations();

  return (
    <Link href="/" className="flex items-center gap-2 px-4 py-5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <GraduationCap className="size-4.5" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-tight text-white">{t.brand.name}</span>
    </Link>
  );
}

export function Sidebar() {
  const t = useTranslations();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <SidebarBrand />
      <SidebarNav />
      <div className="m-3 rounded-xl bg-sidebar-accent p-4">
        <p className="text-sm font-semibold text-white">{t.sidebar.promoTitle}</p>
        <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/60">
          {t.sidebar.promoDescription}
        </p>
      </div>
    </aside>
  );
}

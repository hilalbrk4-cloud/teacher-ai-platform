import type { LucideIcon } from "lucide-react";

import type { Dictionary } from "@/types/i18n";

export type NavKey = keyof Dictionary["nav"];

export interface NavItem {
  key: NavKey;
  href: string;
  icon: LucideIcon;
}

export type AiToolId = keyof Dictionary["quickTools"]["tools"];

export interface AiTool {
  id: AiToolId;
  icon: LucideIcon;
  href: string;
  accent: "indigo" | "amber" | "emerald" | "rose" | "sky";
  favorite: boolean;
}

export type QuickPromptId = keyof Dictionary["quickPrompts"];

export interface QuickPromptConfig {
  id: QuickPromptId;
  icon: LucideIcon;
}

export type DocumentKind = keyof Dictionary["continueWorking"]["kinds"];

export type DocumentStatus = keyof Dictionary["continueWorking"]["statuses"];

export interface ContinueWorkingItem {
  id: string;
  title: string;
  subject: string;
  kind: DocumentKind;
  updatedAt: string;
  progress: number;
  status: DocumentStatus;
}

export interface AiSuggestion {
  id: string;
  title: string;
  ctaLabel: string;
  icon: LucideIcon;
}

export interface ActivityItem {
  id: string;
  description: string;
  timestamp: string;
  icon: LucideIcon;
}

export interface TeacherProfile {
  name: string;
  role: string;
  school: string;
  avatarInitials: string;
}

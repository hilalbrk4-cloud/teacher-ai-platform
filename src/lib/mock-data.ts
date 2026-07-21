import {
  BookOpenCheck,
  ClipboardList,
  FileQuestion,
  History,
  LayoutDashboard,
  Mail,
  MessagesSquare,
  NotebookPen,
  Presentation,
  ScrollText,
  Settings,
  Sparkles,
  Star,
  Sunrise,
  Ticket,
  Type,
  Wand2,
} from "lucide-react";

import type {
  ActivityItem,
  AiSuggestion,
  AiTool,
  ContinueWorkingItem,
  NavItem,
  QuickPromptConfig,
  TeacherProfile,
} from "@/types/dashboard";

export const primaryNavItems: NavItem[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "aiTools", href: "/ai-tools", icon: Wand2 },
  { key: "documents", href: "/documents", icon: ClipboardList },
  { key: "favorites", href: "/favorites", icon: Star },
  { key: "history", href: "/history", icon: History },
  { key: "settings", href: "/settings", icon: Settings },
];

export const teacherProfile: TeacherProfile = {
  name: "Hilal Barak",
  role: "Fen Bilimleri Öğretmeni",
  school: "Zübeyde Hanım Ortaokulu",
  avatarInitials: "HB",
};

export const quickPrompts: QuickPromptConfig[] = [
  { id: "lessonPlan", icon: NotebookPen },
  { id: "quiz", icon: FileQuestion },
  { id: "worksheet", icon: ScrollText },
  { id: "rubric", icon: BookOpenCheck },
  { id: "parentMessage", icon: Mail },
  { id: "classActivity", icon: Sparkles },
];

export const quickAiTools: AiTool[] = [
  {
    id: "lessonPlanner",
    icon: NotebookPen,
    href: "/ai-tools/lesson-planner",
    accent: "indigo",
    favorite: true,
  },
  {
    id: "quizGenerator",
    icon: FileQuestion,
    href: "/ai-tools/quiz-generator",
    accent: "amber",
    favorite: false,
  },
  {
    id: "worksheetGenerator",
    icon: ScrollText,
    href: "/ai-tools/worksheet-generator",
    accent: "emerald",
    favorite: false,
  },
  {
    id: "rubricGenerator",
    icon: BookOpenCheck,
    href: "/ai-tools/rubric-generator",
    accent: "rose",
    favorite: true,
  },
  {
    id: "presentationBuilder",
    icon: Presentation,
    href: "/ai-tools/presentation-builder",
    accent: "sky",
    favorite: false,
  },
  {
    id: "parentMessageGenerator",
    icon: Mail,
    href: "/ai-tools/parent-message-generator",
    accent: "indigo",
    favorite: false,
  },
];

export const continueWorkingItems: ContinueWorkingItem[] = [
  {
    id: "doc-1",
    title: "Fotosentez Ders Planı",
    subject: "7. Sınıf Fen Bilimleri",
    kind: "lesson-plan",
    updatedAt: "2026-07-20T14:30:00Z",
    progress: 45,
    status: "draft",
  },
  {
    id: "doc-2",
    title: "Kesirler Quizi",
    subject: "5. Sınıf Matematik",
    kind: "quiz",
    updatedAt: "2026-07-19T09:15:00Z",
    progress: 70,
    status: "in-progress",
  },
  {
    id: "doc-3",
    title: "Okuma Anlama Çalışma Kâğıdı",
    subject: "Türkçe",
    kind: "worksheet",
    updatedAt: "2026-07-18T16:45:00Z",
    progress: 100,
    status: "ready",
  },
  {
    id: "doc-4",
    title: "Grup Projesi Rubriği",
    subject: "Fen Bilimleri",
    kind: "rubric",
    updatedAt: "2026-07-17T11:00:00Z",
    progress: 55,
    status: "in-progress",
  },
];

export const aiSuggestions: AiSuggestion[] = [
  {
    id: "suggestion-warm-up",
    title: "Fen dersi için ısınma etkinliği oluştur",
    ctaLabel: "Etkinlik oluştur",
    icon: Sunrise,
  },
  {
    id: "suggestion-simplify",
    title: "Metni 5. sınıf seviyesine sadeleştir",
    ctaLabel: "Sadeleştir",
    icon: Type,
  },
  {
    id: "suggestion-exit-ticket",
    title: "Çıkış bileti hazırla",
    ctaLabel: "Hazırla",
    icon: Ticket,
  },
  {
    id: "suggestion-parent-update",
    title: "Veli bilgilendirme mesajı oluştur",
    ctaLabel: "Mesaj oluştur",
    icon: MessagesSquare,
  },
];

export const recentActivity: ActivityItem[] = [
  {
    id: "activity-1",
    description: "Ders planı oluşturuldu",
    timestamp: "2026-07-20T18:10:00Z",
    icon: NotebookPen,
  },
  {
    id: "activity-2",
    description: "Quiz güncellendi",
    timestamp: "2026-07-19T21:40:00Z",
    icon: FileQuestion,
  },
  {
    id: "activity-3",
    description: "Rubrik kaydedildi",
    timestamp: "2026-07-18T13:05:00Z",
    icon: BookOpenCheck,
  },
  {
    id: "activity-4",
    description: "Veli mesajı gönderildi",
    timestamp: "2026-07-16T15:00:00Z",
    icon: Mail,
  },
];

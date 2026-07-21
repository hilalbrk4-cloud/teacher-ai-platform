export const locales = ["tr", "en"] as const;

export type Locale = (typeof locales)[number];

export interface Dictionary {
  brand: {
    name: string;
  };
  nav: {
    dashboard: string;
    aiTools: string;
    documents: string;
    favorites: string;
    history: string;
    settings: string;
  };
  sidebar: {
    promoTitle: string;
    promoDescription: string;
  };
  topbar: {
    searchPlaceholder: string;
    searchLabel: string;
    openNavigation: string;
    navigationTitle: string;
    notifications: string;
    help: string;
    profile: string;
    accountSettings: string;
    logout: string;
  };
  commandCenter: {
    greeting: (name: string) => string;
    heading: string;
    helperText: string;
    placeholder: string;
    inputLabel: string;
    generate: string;
    generating: string;
  };
  quickPrompts: Record<
    "lessonPlan" | "quiz" | "worksheet" | "rubric" | "parentMessage" | "classActivity",
    { label: string; prompt: string }
  >;
  quickTools: {
    title: string;
    description: string;
    seeAll: string;
    quickStart: string;
    addFavorite: (title: string) => string;
    removeFavorite: (title: string) => string;
    tools: Record<
      | "lessonPlanner"
      | "quizGenerator"
      | "worksheetGenerator"
      | "rubricGenerator"
      | "presentationBuilder"
      | "parentMessageGenerator",
      { title: string; description: string }
    >;
  };
  continueWorking: {
    title: string;
    description: string;
    viewAll: string;
    continueLabel: string;
    readyToUse: string;
    editedPrefix: string;
    statuses: Record<"draft" | "in-progress" | "ready", string>;
    kinds: Record<
      "lesson-plan" | "quiz" | "worksheet" | "rubric" | "slides" | "letter",
      string
    >;
  };
  aiSuggestions: {
    title: string;
    description: string;
  };
  recentActivity: {
    title: string;
    description: string;
  };
}

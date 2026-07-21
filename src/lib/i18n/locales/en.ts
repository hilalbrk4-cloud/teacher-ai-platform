import type { Dictionary } from "@/types/i18n";

export const en: Dictionary = {
  brand: {
    name: "EduPilot",
  },
  nav: {
    dashboard: "Dashboard",
    aiTools: "AI Tools",
    documents: "Documents",
    favorites: "Favorites",
    history: "History",
    settings: "Settings",
  },
  sidebar: {
    promoTitle: "Save more time",
    promoDescription: "Explore every AI tool built for your classroom workflow.",
  },
  topbar: {
    searchPlaceholder: "Tell EduPilot what you'd like to create...",
    searchLabel: "Search",
    openNavigation: "Open navigation",
    navigationTitle: "Navigation",
    notifications: "Notifications",
    help: "Help & support",
    profile: "Profile",
    accountSettings: "Account settings",
    logout: "Log out",
  },
  commandCenter: {
    greeting: (name) => `Hi ${name} 👋`,
    heading: "What would you like to create today?",
    helperText:
      "With EduPilot you can create a lesson plan, quiz, worksheet, rubric and more in seconds.",
    placeholder: "Ask for a lesson plan, worksheet, quiz, rubric or activity...",
    inputLabel: "Describe what you'd like to create",
    generate: "Generate",
    generating: "Generating...",
  },
  quickPrompts: {
    lessonPlan: { label: "Create a lesson plan", prompt: "Create a lesson plan about " },
    quiz: { label: "Build a quiz", prompt: "Build a quiz about " },
    worksheet: { label: "Create a worksheet", prompt: "Create a worksheet about " },
    rubric: { label: "Create a rubric", prompt: "Create a grading rubric for " },
    parentMessage: { label: "Write a parent message", prompt: "Write a parent message about " },
    classActivity: { label: "Create a class activity", prompt: "Create a class activity about " },
  },
  quickTools: {
    title: "Quick AI Tools",
    description: "Jump straight into the tools you use most.",
    seeAll: "See all",
    quickStart: "Quick start",
    addFavorite: (title) => `Add ${title} to favorites`,
    removeFavorite: (title) => `Remove ${title} from favorites`,
    tools: {
      lessonPlanner: {
        title: "Lesson Planner",
        description: "Draft a standards-aligned lesson in minutes.",
      },
      quizGenerator: {
        title: "Quiz Generator",
        description: "Turn any topic into a ready-to-give quiz.",
      },
      worksheetGenerator: {
        title: "Worksheet Generator",
        description: "Create differentiated worksheets instantly.",
      },
      rubricGenerator: {
        title: "Rubric Generator",
        description: "Build clear grading rubrics for any assignment.",
      },
      presentationBuilder: {
        title: "Presentation Builder",
        description: "Generate slide decks from your lesson notes.",
      },
      parentMessageGenerator: {
        title: "Parent Message Generator",
        description: "Write warm, clear parent updates fast.",
      },
    },
  },
  continueWorking: {
    title: "Continue Working",
    description: "Pick up your in-progress documents.",
    viewAll: "View all",
    continueLabel: "Continue",
    readyToUse: "Ready to use",
    editedPrefix: "Edited",
    statuses: {
      draft: "Draft",
      "in-progress": "In progress",
      ready: "Ready",
    },
    kinds: {
      "lesson-plan": "Lesson Plan",
      quiz: "Quiz",
      worksheet: "Worksheet",
      rubric: "Rubric",
      slides: "Slides",
      letter: "Letter",
    },
  },
  aiSuggestions: {
    title: "Suggestions for today",
    description: "Smart nudges based on your recent activity.",
  },
  recentActivity: {
    title: "Recent Activity",
    description: "A quick look at what's happened lately.",
  },
};

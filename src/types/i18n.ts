import type { LessonPlanRefinementId, LessonPlanSectionKey } from "@/types/lesson-planner";
import type {
  CognitiveLevel,
  DifficultyLevel,
  QuestionApproach,
  QuestionType,
  QuizRequiredField,
  QuizType,
  VisualType,
  VisualUsage,
} from "@/types/quiz-generator";

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
  lessonPlanner: {
    pageTitle: string;
    pageHelperText: string;
    hero: {
      eyebrow: string;
      highlights: string[];
    };
    form: {
      essentialTitle: string;
      advancedTitle: string;
      advancedToggleShow: string;
      advancedToggleHide: string;
      refinementsTitle: string;
      refinementsDescription: string;
      refinements: Record<LessonPlanRefinementId, string>;
      fields: Record<
        | "subject"
        | "gradeLevel"
        | "topic"
        | "duration"
        | "objectives"
        | "teachingApproach"
        | "studentLevel"
        | "materials"
        | "assessmentPreference"
        | "specialNeeds"
        | "additionalNotes",
        { label: string; placeholder: string }
      >;
      errors: Record<"subject" | "gradeLevel" | "topic" | "duration" | "objectives", string>;
      validationBanner: string;
      submit: string;
      submitLoading: string;
      submitCaption: string;
    };
    loadingMessages: [string, string, string];
    preview: {
      title: string;
      liveBadge: string;
      emptyTitle: string;
      emptyDescription: string;
      structureHint: string;
      sectionPendingText: string;
      summaryDuration: (minutes: number) => string;
    };
    sections: Record<LessonPlanSectionKey, string>;
    result: {
      statusDraft: string;
      statusSaved: string;
      generatedAtPrefix: string;
      savedAtPrefix: string;
      exportUnavailableTooltip: string;
      comingSoonBadge: string;
      actions: {
        edit: string;
        doneEditing: string;
        save: string;
        copyAll: string;
        copySection: string;
        regenerate: string;
        regenerating: string;
        shorten: string;
        expand: string;
        exportWord: string;
        exportPdf: string;
        duplicate: string;
        print: string;
      };
      improve: {
        trigger: string;
      };
    };
    qualityCard: {
      title: string;
      description: string;
      placeholderNote: string;
      metrics: {
        completeness: { label: string; good: string; attention: string };
        balance: { label: string; good: string; attention: string };
        assessment: { label: string; good: string; attention: string };
      };
    };
    continueWithAi: {
      title: string;
      description: string;
      placeholder: string;
      buttonLabel: string;
      comingSoonBadge: string;
    };
    feedback: {
      generated: string;
      generationError: string;
      requestTimeout: string;
      saved: string;
      duplicated: string;
      copiedAll: string;
      copiedSection: string;
      copyError: string;
      shortened: string;
      expanded: string;
      validation: string;
    };
  };
  quizGenerator: {
    pageTitle: string;
    pageHelperText: string;
    hero: {
      eyebrow: string;
      highlights: string[];
    };
    labels: {
      quizTypes: Record<QuizType, string>;
      questionTypes: Record<QuestionType, string>;
      questionApproaches: Record<QuestionApproach, string>;
      cognitiveLevels: Record<CognitiveLevel, string>;
      difficultyLevels: Record<DifficultyLevel | "mixed", string>;
      visualUsageOptions: Record<VisualUsage, string>;
      visualTypes: Record<VisualType, string>;
    };
    form: {
      essentialTitle: string;
      advancedTitle: string;
      advancedToggleShow: string;
      advancedToggleHide: string;
      fields: Record<
        "quizType" | "subject" | "gradeLevel" | "topic" | "objectives" | "questionCount",
        { label: string; placeholder: string }
      >;
      questionTypesLabel: string;
      questionTypesDescription: string;
      questionApproachLabel: string;
      cognitiveLevelLabel: string;
      difficultyLabel: string;
      visualUsageLabel: string;
      visualTypesLabel: string;
      visualTypesDescription: string;
      includeAnswerKeyLabel: string;
      includeExplanationsLabel: string;
      errors: Record<QuizRequiredField, string>;
      validationBanner: string;
      submit: string;
      submitLoading: string;
      submitCaption: string;
    };
    loadingMessages: [string, string, string];
    preview: {
      title: string;
      liveBadge: string;
      emptyTitle: string;
      emptyDescription: string;
      structureHint: string;
      questionPendingText: string;
      summaryQuestionCount: (count: number) => string;
      pointsLabel: (points: number) => string;
      correctAnswerLabel: string;
      explanationLabel: string;
      visualQuestion: {
        infoLabel: string;
        correctMark: string;
        unsupported: string;
      };
    };
    answerKey: {
      title: string;
      toggleShow: string;
      toggleHide: string;
    };
    result: {
      statusDraft: string;
      statusSaved: string;
      generatedAtPrefix: string;
      savedAtPrefix: string;
      exportUnavailableTooltip: string;
      comingSoonBadge: string;
      actions: {
        edit: string;
        doneEditing: string;
        save: string;
        copyAll: string;
        regenerate: string;
        regenerating: string;
        exportWord: string;
        exportPdf: string;
        duplicate: string;
        print: string;
      };
      improve: {
        trigger: string;
        makeEasier: string;
        makeHarder: string;
        convertToNewGeneration: string;
        increaseVisualQuestions: string;
        addGraphQuestions: string;
        improveDistractors: string;
        shortenQuiz: string;
        expandQuiz: string;
        comingSoonBadge: string;
      };
    };
    feedback: {
      generated: string;
      generationError: string;
      requestTimeout: string;
      saved: string;
      duplicated: string;
      copiedAll: string;
      copyError: string;
      validation: string;
    };
  };
}

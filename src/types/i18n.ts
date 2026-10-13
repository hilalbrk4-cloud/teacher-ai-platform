import type {
  LessonPlan5EPhase,
  LessonPlanRefinementId,
  LessonPlanSectionKey,
  LessonPlanSkills,
} from "@/types/lesson-planner";
import type { RubricRequiredField, RubricTaskType, RubricType } from "@/types/rubric";
import type { PresentationRequiredField, PresentationType, SlideLayout } from "@/types/presentation";
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
  curriculum: {
    topicPlaceholder: string;
    topicListLabel: string;
    topicLoading: string;
    topicLoadError: string;
    noTopicMatch: (query: string) => string;
    freeTopicOption: (query: string) => string;
    fromCurriculum: string;
    clearSelection: string;
    noCurriculumHint: string;
    officialTitleTymm: string;
    officialTitlePrevious: string;
    officialDescription: string;
    selectAll: string;
    clearAll: string;
    selectedCount: (count: number) => string;
    componentsCount: (count: number) => string;
    autoIncludedTitle: string;
    autoIncludedEmpty: string;
    sourceNote: string;
    objectivesHint: string;
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
      fiveEBadge: string;
      phaseBadge: (index: number) => string;
      timeRange: (start: number, end: number) => string;
      timeRangeLabel: (start: number, end: number) => string;
    };
    sections: Record<LessonPlanSectionKey, string>;
    phaseFocus: Record<LessonPlan5EPhase, string>;
    skills: {
      title: string;
      description: string;
      groups: Record<keyof LessonPlanSkills, { short: string; label: string }>;
      literacy: { short: string; label: string };
      officialOutcomes: string;
      officialSource: string;
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
        copySection: string;
        regenerate: string;
        regenerating: string;
        shorten: string;
        expand: string;
        exportWord: string;
        exportingWord: string;
        exportWordTooltip: string;
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
      exportedWord: (fileName: string) => string;
      exportWordError: string;
      shortened: string;
      expanded: string;
      validation: string;
    };
  };
  rubricGenerator: {
    pageTitle: string;
    pageHelperText: string;
    hero: { eyebrow: string; highlights: string[] };
    form: {
      essentialTitle: string;
      taskTitle: string;
      fields: Record<"subject" | "gradeLevel" | "topic" | "taskDescription", { label: string; placeholder: string }>;
      taskTypeLabel: string;
      taskTypes: Record<RubricTaskType, { label: string; description: string }>;
      rubricTypeLabel: string;
      rubricTypes: Record<RubricType, { label: string; description: string }>;
      scaleLabel: string;
      scales: Record<"3" | "4", string>;
      skillsDescription: string;
      skillsAutoTitle: string;
      noCurriculumSkillsHint: string;
      errors: Record<RubricRequiredField, string>;
      validationBanner: string;
      submit: string;
      submitLoading: string;
      submitCaption: string;
    };
    live: {
      tab: string;
      tabShort: string;
      rosterTitle: string;
      rosterDescription: string;
      rosterPlaceholder: string;
      rosterLoad: string;
      rosterEdit: string;
      rosterCancel: string;
      rosterLoaded: (count: number) => string;
      rosterEmpty: string;
      rosterDetected: (count: number) => string;
      studentsTitle: string;
      progress: (done: number, total: number) => string;
      status: { done: string; partial: string; waiting: string };
      totalLabel: string;
      outOf: (points: number) => string;
      levelPoints: (points: number) => string;
      criterionProgress: (scored: number, total: number) => string;
      holisticLevelTitle: string;
      holisticScoreLabel: (min: number, max: number) => string;
      feedbackTitle: string;
      feedbackAuto: string;
      feedbackEdited: string;
      feedbackRegenerate: string;
      feedbackAi: string;
      feedbackAiLoading: string;
      feedbackAiBadge: string;
      feedbackAiError: string;
      feedbackAiPrivacy: string;
      feedbackPlaceholder: string;
      previous: string;
      next: string;
      reset: string;
      exportSheet: string;
      exporting: string;
      exported: (fileName: string) => string;
      exportError: string;
      storageNote: string;
      showForm: string;
      hideForm: string;
    };
    levels: Record<string, string>;
    loadingMessages: [string, string, string];
    preview: {
      title: string;
      emptyTitle: string;
      emptyDescription: string;
      tabsLabel: string;
      teacherTab: string;
      teacherTabShort: string;
      studentTab: string;
      studentTabShort: string;
      criterion: string;
      weight: string;
      points: (points: number) => string;
      total: string;
      levelRange: (min: number, max: number) => string;
      holisticTitle: string;
      holisticCriteriaTitle: string;
      officialSkillsTitle: string;
      conceptualSkills: string;
      noCodesNote: string;
      studentFormTitle: string;
      peerFormTitle: string;
      studentNameLine: string;
      myTask: string;
      checkDone: string;
      checkSelf: string;
      checkPeer: string;
      hint: string;
      holisticSelfTitle: string;
      reflectionNext: string;
      peerName: string;
      peerAdvice: string;
      studentViewNote: string;
    };
    actions: {
      exportOfficial: string;
      exportStudent: string;
      exportStudentHint: string;
      exporting: string;
      regenerate: string;
      regenerating: string;
    };
    feedback: {
      generated: string;
      generationError: string;
      requestTimeout: string;
      validation: string;
      exported: (fileName: string) => string;
      exportError: string;
    };
  };
  presentationBuilder: {
    pageTitle: string;
    pageHelperText: string;
    hero: { eyebrow: string; highlights: string[] };
    form: {
      essentialTitle: string;
      formatTitle: string;
      fields: Record<"subject" | "gradeLevel" | "topic", { label: string; placeholder: string }>;
      typeLabel: string;
      types: Record<PresentationType, { label: string; description: string }>;
      slideCountLabel: string;
      slideCounts: Record<"5" | "8", { label: string; description: string }>;
      outcomesDescription: string;
      outcomesAutoTitle: string;
      noCurriculumHint: string;
      errors: Record<PresentationRequiredField, string>;
      validationBanner: string;
      submit: string;
      submitLoading: string;
      submitCaption: string;
    };
    loadingMessages: [string, string, string];
    preview: {
      title: string;
      emptyTitle: string;
      emptyDescription: string;
      slideLabel: (current: number, total: number) => string;
      filmstripLabel: string;
      layouts: Record<SlideLayout, string>;
      teacherNote: string;
      activity: string;
      outcomeCodes: string;
      imageLoading: string;
      imageNone: string;
      imageCredit: (author: string, license: string) => string;
      nextImage: string;
      removeImage: string;
      restoreImage: string;
      imageCount: (current: number, total: number) => string;
      previous: string;
      next: string;
      showForm: string;
      hideForm: string;
    };
    board: {
      open: string;
      close: string;
      hint: string;
      timerLabel: string;
      timerStart: string;
      timerPause: string;
      timerReset: string;
      timerDone: string;
      activityBadge: string;
    };
    actions: {
      exportPptx: string;
      exportingPptx: string;
      regenerate: string;
      regenerating: string;
    };
    feedback: {
      generated: string;
      generationError: string;
      requestTimeout: string;
      validation: string;
      exported: (fileName: string) => string;
      exportError: string;
      fullscreenUnavailable: string;
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
      plan: {
        gradePlaceholder: string;
        topicPlaceholder: string;
        topicOutcomeCount: (count: number) => string;
        manualTopic: string;
        planTopic: string;
        planSource: (subject: string, grade: number) => string;
        noPlanHint: string;
        outcomesDescription: string;
        objectivesHint: string;
      };
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

# EduPilot Coding Standards

## Existing Stack

Keep the existing project stack and architecture.

Expected technologies:

- Next.js or React, according to the current project
- TypeScript
- Tailwind CSS
- shadcn/ui where appropriate
- Lucide icons

Do not migrate frameworks without explicit approval.

## TypeScript

Use strict, meaningful types. Avoid `any`. Define reusable interfaces for shared data.

## Components

Create reusable components when a pattern appears more than once. Prefer focused components over very large files.

## File Organization

Follow the existing project structure. A preferred feature organization is:

```text
src/
  app/
  components/
  features/
    lesson-planner/
      components/
      data/
      hooks/
      types/
      utils/
  lib/
  hooks/
  types/
```

Do not reorganize the entire repository solely to match this example.

## Styling

Prefer Tailwind utilities and existing design tokens. Avoid inline styles and random hard-coded colors.

## State

Use local state for local UI behavior. Introduce global state only when truly needed.

## Data

Until a backend is implemented, use realistic mock data and keep it separate from UI components.

## Forms

Use clear labels, validation, useful error messages, keyboard support, and preserve user input where possible.

## Accessibility

Use semantic HTML. Ensure labels, accessible icon buttons, focus management, keyboard reachability, and visible focus states.

## Quality Checks

Before completing a task:

- run TypeScript checks
- run ESLint
- check console errors
- check responsive layouts
- inspect loading, empty, error, and success states

## Git Safety

Do not delete `.git`, rewrite Git history, force push, commit secrets, or expose API keys.

Do not commit automatically unless the user explicitly asks.

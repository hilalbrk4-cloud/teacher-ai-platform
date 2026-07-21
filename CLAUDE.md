# CLAUDE.md

# EduPilot Engineering Specification

## Role

You are the Lead Product Engineer, Senior Frontend Engineer and Senior UI/UX Designer of EduPilot.

Your responsibility is to build a production-ready SaaS platform for teachers.

Prioritize:

- Simplicity
- Scalability
- Maintainability
- Accessibility
- Performance
- Professional UI
- Reusable components

Never generate demo-quality code.

---

# Project

EduPilot is an AI-powered workspace for teachers.

It is NOT:

- LMS
- Student portal
- Parent portal
- School management software

Its mission is to help teachers save time.

---

# Tech Stack

- React or Next.js (keep existing)
- TypeScript
- TailwindCSS
- shadcn/ui
- Lucide Icons

Prefer Server Components if using Next.js.

---

# Reference Design

Before every UI task analyze:

references/smart-dashboard.png

Study:

- layout
- spacing
- typography
- hierarchy
- sidebar
- cards
- responsiveness

Do not copy branding.

Recreate the same premium quality while transforming it into EduPilot.

---

# Brand

Name: EduPilot

Tone:

- Professional
- Minimal
- Calm
- Intelligent

Never childish.

---

# Dashboard

Sidebar

- Dashboard
- AI Tools
- Documents
- Favorites
- History
- Settings

Topbar

- Search
- Notifications
- Help
- Profile

Sections

- Welcome Banner
- Quick AI Tools
- Recent Documents
- Weekly Summary
- AI Suggestions

Use realistic mock data.

---

# Design Rules

Whitespace is important.

Avoid clutter.

Cards must have consistent radius.

Use subtle shadows.

Hover states should feel premium.

Spacing must be consistent.

Never place elements randomly.

---

# Components

Always create reusable components.

Examples:

- Sidebar
- Topbar
- Card
- Button
- Modal
- ToolCard
- SectionTitle

Never duplicate code.

---

# Responsive

Desktop first.

Then tablet.

Then mobile.

No broken layouts.

---

# Code Quality

Use:

- clean naming
- strict TypeScript
- reusable hooks
- reusable utilities

Avoid inline styles.

Avoid duplicated logic.

---

# Folder Structure

src/

components/

features/

hooks/

lib/

types/

pages or app/

assets/

---

# AI Features (Future)

- Lesson Planner
- Quiz Generator
- Worksheet Generator
- Rubric Generator
- Presentation Builder
- Text Simplifier
- Email Generator
- Parent Message Generator

---

# Development Workflow

For every task:

1. Read this document.
2. Analyze the reference image.
3. Plan.
4. Implement.
5. Refactor.
6. Verify responsiveness.

Never rush implementation.

---

# Definition of Done

A feature is complete only if:

- Responsive
- Accessible
- Reusable
- Clean code
- Matches design language
- Production quality

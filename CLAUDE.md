# CLAUDE.md

# EduPilot — Claude Code Project Instructions

Before making any change:

1. Read this file completely.
2. Read all Markdown files inside `/docs`.
3. Inspect the existing project structure and reuse the current architecture.
4. Treat the documentation as the source of truth.

## Your Role

You are EduPilot's lead product engineer, senior frontend engineer, and senior UI/UX designer.

Build a commercial-quality SaaS product for teachers. Prioritize usability, consistency, accessibility, maintainability, performance, reusable components, and production quality.

## Current Product State

- Dashboard v1 is complete and committed to Git.
- Do not modify the Dashboard unless the user explicitly requests it.
- The next planned feature is the Lesson Planner.

## Core Rules

- Default interface language is Turkish.
- All visible UI text must use natural, professional Turkish.
- The codebase should remain ready for future internationalization.
- Version 1 is for teachers only.
- Do not add student, parent, or administrator panels.
- EduPilot is AI-first, teacher-first, calm, modern, and professional.
- Avoid childish visuals and generic admin-dashboard styling.
- Keep TypeScript and ESLint clean.
- Verify desktop, tablet, and mobile layouts.

## Required Documentation

Always follow:

- `/docs/product.md`
- `/docs/design-system.md`
- `/docs/ux-principles.md`
- `/docs/coding-standards.md`
- `/docs/roadmap.md`
- `/docs/features.md`

## Workflow

1. Understand the user goal.
2. Inspect relevant existing files.
3. Briefly state the implementation plan.
4. Implement with reusable components.
5. Test interactions and responsiveness.
6. Run TypeScript and ESLint checks.
7. Summarize changed files and remaining limitations.

Do not stop at “working.” Stop when the feature feels production-ready.
## TYMM & Yeni Nesil Soru Üretim Kuralları

1. **Bağlamsal Zorunluluk (Dekoratif Görsel Yasağı):** 
   - Bir görsel (ör. `cetvel_olcum` veya `alan_izgara`) ekleniyorsa, sorunun çözümünde gereken en az BİR sayısal/oransal veri SADECE görselden okunabilmelidir.
   - Metin içinde görseldeki verinin aynısı tekrar verilmeyecek ("Aşağıdaki 12 parçaya bölünmüş bahçede..." YERİNE "Aşağıdaki bahçe modeli eş parsellere ayrılmıştır..." denmeli, 12 sayısını öğrenci görselden saymalı).
   - Basit bir nesne ikonu (tahta, araba, elma) için asla görsel komponenti çağrılmamalıdır.

2. **Bilişsel Düzey (En Az 2 Aşamalı Muhakeme):**
   - Tek adımlı "şekilde boyalı olan kesir kaçtır?" soruları YASAKTIR.
   - Soru en az iki aşama içermelidir:
     * Adım 1: Görselden bir orantı/kesir okuma.
     * Adım 2: Bu kesri gerçek hayat senaryosunda (ör. kapasite, kalan miktar, tolerans farkı) başka bir değerle karşılaştırma veya işleme sokma.

3. **Pedagojik Çeldirici Zorunluluğu:**
   - 4 seçenek de rastgele kesirler olamaz. Çeldiriciler şu öğrenci yanılgılarına dayanmalıdır:
     * Pay ve paydayı doğrudan toplama hatası.
     * Birim kesir aralıklarını yanlış sayma (çizgi sayma yerine aralık saymama).
     * Parçanın bütüne oranı yerine parçanın kalan parçaya oranını alma.
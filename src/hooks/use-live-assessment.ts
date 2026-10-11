"use client";

import * as React from "react";

import { parseRoster } from "@/lib/rubric/live/roster";
import { clampHolisticScore, emptyScore, generateLiveFeedback, holisticDefaultScore } from "@/lib/rubric/live/scoring";
import type { LiveScore, LiveSession, LiveStudent } from "@/lib/rubric/live/types";
import type { Rubric } from "@/types/rubric";

/** Sınıf listesi rubrikler arasında korunur; puanlar rubriğe özeldir. */
const ROSTER_KEY = "edupilot.liveAssessment.roster";
const sessionKey = (rubricId: string) => `edupilot.liveAssessment.session.${rubricId}`;

function readJson<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Gizli sekme / kapalı depolama: puanlar oturum boyunca state'te kalır.
  }
}

function loadSession(rubric: Rubric): LiveSession {
  const stored = readJson<LiveSession>(sessionKey(rubric.id));
  if (stored?.version === 1 && Array.isArray(stored.students)) return stored;
  const roster = readJson<LiveStudent[]>(ROSTER_KEY);
  return { version: 1, rubricId: rubric.id, students: Array.isArray(roster) ? roster : [], scores: {} };
}

/**
 * Canlı Değerlendirme durumu: sınıf listesi, öğrenci başına seviye seçimleri,
 * anında üretilen (ve öğretmen düzenlemediyse güncellenen) geri bildirim.
 * Her değişiklik localStorage'a yazılır; sayfa yenilense de puanlar kaybolmaz.
 */
export function useLiveAssessment(rubric: Rubric) {
  const [session, setSession] = React.useState<LiveSession>(() => loadSession(rubric));
  const [selectedId, setSelectedId] = React.useState<string | null>(() => session.students[0]?.id ?? null);

  React.useEffect(() => {
    writeJson(sessionKey(rubric.id), session);
  }, [rubric.id, session]);

  const studentName = React.useCallback(
    (id: string) => session.students.find((student) => student.id === id)?.name ?? "",
    [session.students]
  );

  /** Bir öğrencinin puanını günceller ve geri bildirimi (elle düzenlenmediyse) yeniden üretir. */
  const updateScore = React.useCallback(
    (studentId: string, change: (score: LiveScore) => LiveScore) => {
      setSession((prev) => {
        const current = prev.scores[studentId] ?? emptyScore();
        let next = change(current);
        if (!next.feedbackEdited) {
          const name = prev.students.find((student) => student.id === studentId)?.name ?? "";
          next = { ...next, feedback: generateLiveFeedback(rubric, name, next), feedbackSource: "auto" };
        }
        return { ...prev, scores: { ...prev.scores, [studentId]: next } };
      });
    },
    [rubric]
  );

  const loadRoster = React.useCallback((text: string): number => {
    const students = parseRoster(text);
    if (students.length === 0) return 0;
    writeJson(ROSTER_KEY, students);
    setSession((prev) => {
      // Aynı kimlikli öğrencilerin puanları korunur (listeyi yeniden yapıştırmak puanları silmez).
      const keep = Object.fromEntries(Object.entries(prev.scores).filter(([id]) => students.some((student) => student.id === id)));
      return { ...prev, students, scores: keep };
    });
    setSelectedId(students[0].id);
    return students.length;
  }, []);

  const setLevel = React.useCallback(
    (studentId: string, criterionId: string, level: number) =>
      updateScore(studentId, (score) => ({ ...score, levels: { ...score.levels, [criterionId]: level } })),
    [updateScore]
  );

  const setHolisticLevel = React.useCallback(
    (studentId: string, level: number) =>
      updateScore(studentId, (score) => ({ ...score, holisticLevel: level, holisticScore: holisticDefaultScore(rubric, level) })),
    [rubric, updateScore]
  );

  const setHolisticScore = React.useCallback(
    (studentId: string, value: number) =>
      updateScore(studentId, (score) =>
        score.holisticLevel === undefined ? score : { ...score, holisticScore: clampHolisticScore(rubric, score.holisticLevel, value) }
      ),
    [rubric, updateScore]
  );

  const setFeedback = React.useCallback((studentId: string, feedback: string) => {
    setSession((prev) => ({
      ...prev,
      scores: { ...prev.scores, [studentId]: { ...(prev.scores[studentId] ?? emptyScore()), feedback, feedbackEdited: true, feedbackSource: "teacher" } },
    }));
  }, []);

  /** AI metni: elle düzenleme gibi korunur (seviye değişse de üzerine yazılmaz), kaynağı "ai" olarak işaretlenir. */
  const setAiFeedback = React.useCallback((studentId: string, feedback: string) => {
    setSession((prev) => ({
      ...prev,
      scores: { ...prev.scores, [studentId]: { ...(prev.scores[studentId] ?? emptyScore()), feedback, feedbackEdited: true, feedbackSource: "ai" } },
    }));
  }, []);

  /** Elle düzenlenmiş metni bırakıp otomatik geri bildirime döner. */
  const regenerateFeedback = React.useCallback(
    (studentId: string) => updateScore(studentId, (score) => ({ ...score, feedbackEdited: false })),
    [updateScore]
  );

  const resetStudent = React.useCallback((studentId: string) => {
    setSession((prev) => {
      const scores = { ...prev.scores };
      delete scores[studentId];
      return { ...prev, scores };
    });
  }, []);

  return {
    session,
    selectedId: session.students.some((student) => student.id === selectedId) ? selectedId : (session.students[0]?.id ?? null),
    setSelectedId,
    studentName,
    loadRoster,
    setLevel,
    setHolisticLevel,
    setHolisticScore,
    setFeedback,
    setAiFeedback,
    regenerateFeedback,
    resetStudent,
  };
}

"use client";

import { ChevronDown, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/types/i18n";
import type { QuizQuestion } from "@/types/quiz-generator";

function formatAnswer(question: QuizQuestion): string {
  switch (question.type) {
    case "multipleChoice": {
      const correct = question.options.find((option) => option.id === question.correctOptionId);
      return correct?.text ?? "";
    }
    case "trueFalse":
      return question.correctAnswer ? "Doğru" : "Yanlış";
    case "shortAnswer":
      return question.acceptableAnswers.join(" / ");
    case "fillInBlank":
      return question.blanks.map((blank) => blank.acceptableAnswers.join(" / ")).join(" | ");
    case "matching":
      return question.correctPairs
        .map((pair) => {
          const left = question.leftItems.find((item) => item.id === pair.leftId)?.text ?? "";
          const right = question.rightItems.find((item) => item.id === pair.rightId)?.text ?? "";
          return `${left} → ${right}`;
        })
        .join("; ");
    case "ordering":
      return question.correctOrder
        .map((id) => question.items.find((item) => item.id === id)?.text ?? "")
        .join(" → ");
    case "openEnded":
      return question.sampleAnswer;
    default:
      return "";
  }
}

interface QuizAnswerKeyPanelProps {
  t: Dictionary;
  questions: QuizQuestion[];
  isOpen: boolean;
  onToggle: () => void;
}

export function QuizAnswerKeyPanel({ t, questions, isOpen, onToggle }: QuizAnswerKeyPanelProps) {
  const copy = t.quizGenerator.answerKey;

  return (
    <Card className="gap-0 overflow-hidden p-0 print:hidden">
      <Button
        type="button"
        variant="ghost"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex h-auto w-full items-center justify-between gap-2 rounded-none px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <KeyRound className="size-3.5 text-primary" aria-hidden="true" />
          {copy.title}
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {isOpen ? copy.toggleHide : copy.toggleShow}
          <ChevronDown className={cn("size-4 transition-transform duration-200", isOpen && "rotate-180")} aria-hidden="true" />
        </span>
      </Button>

      {isOpen ? (
        <ol className="flex flex-col gap-2 border-t border-border px-4 py-3.5 text-sm">
          {questions.map((question, index) => (
            <li key={question.id} className="flex gap-2">
              <span className="shrink-0 font-semibold text-muted-foreground">{index + 1}.</span>
              <span className="text-foreground">{formatAnswer(question)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </Card>
  );
}

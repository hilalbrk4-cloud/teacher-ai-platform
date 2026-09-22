"use client";

import { Textarea } from "@/components/ui/textarea";
import { QuizVisualRenderer } from "@/components/features/quiz-generator/quiz-visual-renderer";
import type { Dictionary } from "@/types/i18n";
import type { QuizQuestion } from "@/types/quiz-generator";

interface QuizQuestionCardProps {
  t: Dictionary;
  index: number;
  question: QuizQuestion;
  editable: boolean;
  showAnswer: boolean;
  onChange: (updater: (question: QuizQuestion) => QuizQuestion) => void;
}

function EditablePrompt({
  question,
  editable,
  onChange,
}: {
  question: QuizQuestion;
  editable: boolean;
  onChange: (updater: (question: QuizQuestion) => QuizQuestion) => void;
}) {
  if (!editable) {
    return <p className="text-sm leading-relaxed text-foreground">{question.prompt}</p>;
  }
  return (
    <Textarea
      value={question.prompt}
      onChange={(event) => {
        const value = event.target.value;
        onChange((prev) => ({ ...prev, prompt: value }));
      }}
      rows={2}
      aria-label={`Soru ${question.id}`}
      className="min-h-16 resize-y text-sm leading-relaxed"
    />
  );
}

function QuestionBody({
  t,
  question,
  editable,
  showAnswer,
  onChange,
}: {
  t: Dictionary;
  question: QuizQuestion;
  editable: boolean;
  showAnswer: boolean;
  onChange: (updater: (question: QuizQuestion) => QuizQuestion) => void;
}) {
  const preview = t.quizGenerator.preview;

  switch (question.type) {
    case "multipleChoice":
      return (
        <div className="flex flex-col gap-1.5">
          {question.options.map((option) => {
            const isCorrect = option.id === question.correctOptionId;
            return (
              <label
                key={option.id}
                className="flex items-center gap-2 rounded-md border border-border/70 px-2.5 py-1.5 text-sm"
              >
                <input
                  type="radio"
                  checked={isCorrect}
                  disabled={!editable}
                  onChange={() => {
                    if (!editable) return;
                    onChange((prev) =>
                      prev.type === "multipleChoice" ? { ...prev, correctOptionId: option.id } : prev
                    );
                  }}
                  className="accent-primary"
                />
                {editable ? (
                  <input
                    value={option.text}
                    onChange={(event) => {
                      const value = event.target.value;
                      onChange((prev) =>
                        prev.type === "multipleChoice"
                          ? {
                              ...prev,
                              options: prev.options.map((item) =>
                                item.id === option.id ? { ...item, text: value } : item
                              ),
                            }
                          : prev
                      );
                    }}
                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 focus-visible:border-ring focus-visible:outline-none"
                  />
                ) : (
                  <span className={isCorrect && showAnswer ? "font-medium text-emerald-600 dark:text-emerald-400" : ""}>
                    {option.text}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      );

    case "trueFalse":
      return (
        <div className="flex items-center gap-4 text-sm">
          {[true, false].map((value) => (
            <label key={String(value)} className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={question.correctAnswer === value}
                disabled={!editable}
                onChange={() => {
                  if (!editable) return;
                  onChange((prev) => (prev.type === "trueFalse" ? { ...prev, correctAnswer: value } : prev));
                }}
                className="accent-primary"
              />
              {value ? "Doğru" : "Yanlış"}
            </label>
          ))}
        </div>
      );

    case "shortAnswer":
      return editable ? (
        <input
          value={question.acceptableAnswers.join(", ")}
          onChange={(event) => {
            const answers = event.target.value.split(",").map((item) => item.trim()).filter(Boolean);
            onChange((prev) => (prev.type === "shortAnswer" ? { ...prev, acceptableAnswers: answers } : prev));
          }}
          className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm"
        />
      ) : showAnswer ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{question.acceptableAnswers.join(" / ")}</p>
      ) : null;

    case "fillInBlank":
      return <p className="text-sm leading-relaxed text-foreground">{question.textWithBlanks}</p>;

    case "matching":
      return (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <ul className="flex flex-col gap-1.5">
            {question.leftItems.map((item) => (
              <li key={item.id} className="rounded-md border border-border/70 px-2.5 py-1.5">
                {item.text}
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-1.5">
            {question.rightItems.map((item) => (
              <li key={item.id} className="rounded-md border border-border/70 px-2.5 py-1.5">
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      );

    case "ordering":
      return (
        <ol className="flex flex-col gap-1.5 text-sm">
          {question.items.map((item, itemIndex) => (
            <li key={item.id} className="flex items-center gap-2 rounded-md border border-border/70 px-2.5 py-1.5">
              <span className="text-xs font-semibold text-muted-foreground">{itemIndex + 1}.</span>
              {item.text}
            </li>
          ))}
        </ol>
      );

    case "openEnded":
      return showAnswer ? (
        <div className="rounded-md bg-muted/40 p-2.5 text-sm">
          <p className="text-xs font-medium text-muted-foreground">{preview.correctAnswerLabel}</p>
          <p className="mt-0.5 text-foreground">{question.sampleAnswer}</p>
        </div>
      ) : null;

    default:
      return null;
  }
}

export function QuizQuestionCard({ t, index, question, editable, showAnswer, onChange }: QuizQuestionCardProps) {
  const preview = t.quizGenerator.preview;
  const typeLabel = t.quizGenerator.labels.questionTypes[question.type];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-semibold tabular-nums text-primary">
            {index}
          </span>
          <span className="text-xs font-medium text-muted-foreground">{typeLabel}</span>
        </div>
        {question.points ? (
          <span className="text-xs font-medium text-muted-foreground">{preview.pointsLabel(question.points)}</span>
        ) : null}
      </div>

      <EditablePrompt question={question} editable={editable} onChange={onChange} />

      {question.visual ? <QuizVisualRenderer visual={question.visual} /> : null}

      <QuestionBody t={t} question={question} editable={editable} showAnswer={showAnswer} onChange={onChange} />

      {showAnswer && question.answerExplanation ? (
        <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{preview.explanationLabel}: </span>
          {question.answerExplanation}
        </div>
      ) : null}
    </div>
  );
}

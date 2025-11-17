import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { QuizQuestion } from "./types";

interface NounQuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
  onSkip: () => void;
}

export function NounQuiz({ questions, onComplete, onSkip }: NounQuizProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleAnswer = () => {
    if (!selectedAnswer) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setShowResult(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      onComplete(
        score + (selectedAnswer === currentQuestion.correctAnswer ? 1 : 0)
      );
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-2xl w-full animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-xl">
              🧪 {t("quiz", "Міні-тест")} ({currentIndex + 1}/{questions.length}
              )
            </CardTitle>
            <Button onClick={onSkip} variant="ghost" size="sm">
              {t("skip", "Пропустити")}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {t("quiz_score", "Правильних відповідей")}: {score}/
            {questions.length}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Питання */}
          <div className="text-center p-6 bg-accent rounded-lg">
            <div className="text-2xl font-bold mb-2">
              {currentQuestion.word}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentQuestion.type === "article"
                ? t("choose_article", "Оберіть правильний артикль")
                : t("choose_plural", "Оберіть форму множини")}
            </div>
          </div>

          {/* Варіанти відповідей */}
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = option === currentQuestion.correctAnswer;
              const showFeedback = showResult && isSelected;

              return (
                <button
                  key={option}
                  onClick={() => !showResult && setSelectedAnswer(option)}
                  disabled={showResult}
                  className={`p-4 rounded-lg border-2 text-lg font-semibold transition-all ${
                    showFeedback
                      ? isCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : isSelected
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary hover:bg-accent"
                  }`}
                >
                  {option}
                  {showFeedback && (isCorrect ? " ✅" : " ❌")}
                </button>
              );
            })}
          </div>

          {/* Пояснення */}
          {showResult && currentQuestion.explanation && (
            <div className="p-4 bg-muted rounded-lg text-sm">
              <div className="font-semibold mb-1">
                {t("explanation", "Пояснення")}:
              </div>
              <div>{currentQuestion.explanation}</div>
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-3">
            {!showResult ? (
              <Button
                onClick={handleAnswer}
                disabled={!selectedAnswer}
                className="w-full"
                size="lg"
              >
                {t("check", "Перевірити")}
              </Button>
            ) : (
              <Button onClick={handleNext} className="w-full" size="lg">
                {isLastQuestion ? t("finish", "Завершити") : t("next", "Далі")}{" "}
                →
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

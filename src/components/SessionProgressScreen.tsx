import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";

interface SessionProgressScreenProps {
  fullyLearnedCount: number; // кількість фраз, які пройшли всі 5 блоків
  totalPhrases: number; // загальна кількість фраз у наборі
  onContinue: () => void; // callback для кнопки "Продовжити"
}

export default function SessionProgressScreen({
  fullyLearnedCount,
  totalPhrases,
  onContinue,
}: SessionProgressScreenProps) {
  const { t } = useTranslation();

  const progressPercent =
    totalPhrases > 0 ? (fullyLearnedCount / totalPhrases) * 100 : 0;

  return (
    <div className="w-full h-full flex items-center justify-center bg-background p-4 animate-fade-in">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="text-6xl mb-4">🎓</div>
          <CardTitle className="text-2xl sm:text-3xl">
            {t("session_progress_title", "Прогрес навчання")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Головний показник */}
          <div>
            <div className="text-base text-muted-foreground mb-2">
              {t("fully_learned", "Повністю вивчено")}
            </div>
            <div className="text-4xl sm:text-5xl font-bold text-primary">
              {fullyLearnedCount}
              <span className="text-2xl text-muted-foreground">
                {" "}
                / {totalPhrases}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {t("phrases", "фраз")}
            </div>
          </div>

          {/* Візуальний прогрес-бар */}
          <div>
            <div className="w-full h-4 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {progressPercent.toFixed(0)}% {t("completed", "завершено")}
            </div>
          </div>

          {/* Кнопка продовження */}
          <Button size="lg" className="w-full" onClick={onContinue}>
            {t("continue_learning", "Продовжити навчання")} →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

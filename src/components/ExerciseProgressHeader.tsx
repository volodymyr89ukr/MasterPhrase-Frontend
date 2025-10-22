import React from "react";
import { useTranslation } from "react-i18next";

interface ExerciseProgressHeaderProps {
  blockNumber: number; // поточний блок (1-5)
  blockName: string; // назва блоку ("Розпізнавання", "Складання фраз", тощо)
  currentInCycle: number; // скільки фраз пройдено в циклі (1-6)
  totalInCycle: number; // всього фраз у циклі (3-6)
  onExit?: () => void; // callback для кнопки виходу
}

export default function ExerciseProgressHeader({
  blockNumber,
  blockName,
  currentInCycle,
  totalInCycle,
  onExit,
}: ExerciseProgressHeaderProps) {
  const { t } = useTranslation();

  const progressPercent =
    totalInCycle > 0 ? (currentInCycle / totalInCycle) * 100 : 0;

  return (
    <div className="w-full bg-card border-b border-border shadow-sm">
      <div className="max-w-4xl mx-auto px-3 py-2 flex items-center justify-between gap-3">
        {/* Ліва частина: Блок X/5 + назва */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <span className="text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">
            {t("block")} {blockNumber}/5
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
            ·
          </span>
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">
            {blockName}
          </span>
        </div>

        {/* Центр: Прогрес-бар + лічильник */}
        <div className="flex items-center gap-2 flex-1 max-w-[180px] sm:max-w-[220px]">
          {/* Прогрес-бар */}
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Лічильник */}
          <span className="text-xs sm:text-sm font-semibold text-foreground whitespace-nowrap">
            {currentInCycle}/{totalInCycle}
          </span>
        </div>

        {/* Права частина: Кнопка виходу */}
        {onExit && (
          <button
            onClick={onExit}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("exit_exercise")}
            title={t("exit_exercise")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

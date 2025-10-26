import React, { useState, ReactNode } from "react";
import ExerciseSwitcher from "./ExerciseSwitcher";
import { useTranslation } from "react-i18next";

interface ExerciseBlockContainerProps {
  theoryText?: string | ReactNode;
  exerciseData?: any[]; // Якщо відомий тип, замініть any[] на конкретний тип
  onBack?: () => void;
  title?: string;
}

const ExerciseBlockContainer: React.FC<ExerciseBlockContainerProps> = ({
  theoryText,
  exerciseData,
  onBack,
  title,
}) => {
  const [showTheory, setShowTheory] = useState(!!theoryText);
  const { t } = useTranslation();

  if (showTheory) {
    return (
      <div className="w-full h-full flex flex-col max-w-2xl mx-auto overflow-hidden">
        <div className="flex-shrink-0 bg-card rounded-t-xl shadow">
          {/* Фіксований хедер */}
          {onBack && (
            <div className="p-4 pb-2">
              <button
                className="px-4 py-2 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
                onClick={onBack}
              >
                {t("back_to_exercise_selection")}
              </button>
            </div>
          )}
          {title && (
            <div className="px-4 pb-3">
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
            </div>
          )}
        </div>

        {/* Скролована зона з текстом теорії */}
        <div className="flex-1 overflow-y-auto bg-card px-6 min-h-0">
          {theoryText && (
            <div className="whitespace-pre-line py-4 text-foreground">
              {theoryText}
            </div>
          )}
        </div>

        {/* Фіксований футер */}
        <div className="flex-shrink-0 bg-card rounded-b-xl shadow p-4 pt-3 border-t border-border">
          <button
            className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            onClick={() => setShowTheory(false)}
          >
            {t("start_exercise")}
          </button>
        </div>
      </div>
    );
  }

  if (
    !exerciseData ||
    !Array.isArray(exerciseData) ||
    exerciseData.length === 0
  ) {
    return (
      <div className="p-8 text-center text-destructive">
        {t("data_not_found")}
      </div>
    );
  }

  return (
    <ExerciseSwitcher
      exerciseData={exerciseData}
      onBack={onBack}
      title={title}
    />
  );
};

export default ExerciseBlockContainer;

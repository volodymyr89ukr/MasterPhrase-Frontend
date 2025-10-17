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
      <div className="p-6 max-w-2xl mx-auto bg-card rounded-xl shadow">
        {onBack && (
          <button
            className="mb-4 px-4 py-2 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
            onClick={onBack}
          >
            {t("back_to_exercise_selection")}
          </button>
        )}
        {title && (
          <h2 className="text-xl font-bold mb-3 text-foreground">{title}</h2>
        )}
        {theoryText && (
          <div className="whitespace-pre-line mb-4 text-foreground">
            {theoryText}
          </div>
        )}
        <button
          className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          onClick={() => setShowTheory(false)}
        >
          {t("start_exercise")}
        </button>
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

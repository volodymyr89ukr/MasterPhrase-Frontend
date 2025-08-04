import React, { useState, ReactNode } from "react";
import ExerciseSwitcher from "./ExerciseSwitcher";
import { useTranslation } from "react-i18next";

interface ExerciseBlockContainerProps {
  theoryText?: string | ReactNode;
  exerciseData: any; // можна конкретизувати тип, якщо відомий
  onBack?: () => void;
  title?: string;
}

export default function ExerciseBlockContainer({
  theoryText,
  exerciseData,
  onBack,
  title,
}: ExerciseBlockContainerProps) {
  const [showTheory, setShowTheory] = useState(true);
  const { t } = useTranslation();

  if (showTheory) {
    return (
      <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow">
        {onBack && (
          <button
            className="mb-4 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            onClick={onBack}
          >
            {t("back_to_exercise_selection")}
          </button>
        )}
        {title && (
          <h2 className="text-xl font-bold mb-3 text-blue-700">{title}</h2>
        )}
        <div className="whitespace-pre-line mb-4">{theoryText}</div>
        <button
          className="px-6 py-2 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-600"
          onClick={() => setShowTheory(false)}
        >
          {t("start_exercise")}
        </button>
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
}

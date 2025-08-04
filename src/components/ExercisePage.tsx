import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import ExerciseBlockContainer from "./ExerciseBlockContainer";
import ExerciseSwitcher from "./ExerciseSwitcher";
import { User } from "../types";
import { Language } from "../AppContext";

// Пропси, які ви передаєте з App.tsx
interface ExercisePageProps {
  user: User | null;
  learningLanguage: Language | null;
}

const ExercisePage: React.FC<ExercisePageProps> = ({
  user,
  learningLanguage,
}) => {
  const { thousandId, setId, exerciseId } = useParams<{
    thousandId: string;
    setId: string;
    exerciseId: string;
  }>();
  const navigate = useNavigate();

  // TODO: Замініть на реальне отримання даних про вправу
  // Наприклад, через контекст, props, або запит до API
  const exerciseType = "matching"; // "matching", "writing", "reading" тощо

  // Вибір компонента для вправи
  let exerciseComponent = null;
  if (exerciseType === "matching") {
    exerciseComponent = <ExerciseBlockContainer />;
  } else if (exerciseType === "writing") {
    exerciseComponent = <ExerciseSwitcher />;
  } else {
    exerciseComponent = <div>Exercise type not supported yet.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto w-full h-full flex flex-col">
      <button
        className="mt-4 mb-2 text-blue-600 hover:underline text-sm self-start"
        onClick={() => navigate(-1)}
      >
        ← Назад
      </button>
      <div className="flex-1 flex flex-col">{exerciseComponent}</div>
    </div>
  );
};

export default ExercisePage;

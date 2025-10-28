import React from "react";
import { useErrorPool } from "../contexts/ErrorPoolContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import BackButton from "./BackButton";
import { Phrase } from "./ExerciseSwitcher"; // Імпортуємо тип

// Цю допоміжну функцію можна винести в utils
function normalizeMaskIndices(idx: number | number[] | undefined): number[] {
  if (idx == null) return [];
  const arr = Array.isArray(idx) ? idx : [idx];
  const nums = arr
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

const ErrorPhraseItem: React.FC<{ phrase: Phrase }> = ({ phrase }) => {
  const { t } = useTranslation();
  const maskIndices = normalizeMaskIndices(phrase.matching_exercise);
  const words = phrase.phrase.split(/\s+/);

  return (
    <li className="bg-card p-4 rounded-lg shadow border border-border">
           {" "}
      <div className="mb-2">
               {" "}
        <div className="text-sm text-muted-foreground mb-1">
                    {t("review_question", "Питання (з пропуском)")}       {" "}
        </div>
               {" "}
        <p className="text-lg font-medium text-card-foreground">
                   {" "}
          {words
            .map((w, i) => (maskIndices.includes(i + 1) ? "__________" : w))
            .join(" ")}
                 {" "}
        </p>
             {" "}
      </div>
           {" "}
      <div className="mb-2">
               {" "}
        <div className="text-sm text-muted-foreground mb-1">
                    {t("review_translation", "Переклад")}       {" "}
        </div>
               {" "}
        <p className="text-base text-muted-foreground italic">
                    {phrase.translation}       {" "}
        </p>
             {" "}
      </div>
           {" "}
      <div className="mb-2 p-2 bg-primary/10 rounded border border-primary/50">
               {" "}
        <div className="text-sm text-primary mb-1">
                    {t("review_correct_word", "Правильне слово")}       {" "}
        </div>
               {" "}
        <p className="text-lg font-bold text-primary">{phrase.answer}</p>     {" "}
      </div>
           {" "}
      <div className="mt-3">
               {" "}
        <div className="text-sm text-muted-foreground mb-1">
                    {t("review_full_sentence", "Повне речення")}       {" "}
        </div>
               {" "}
        <p className="text-base text-card-foreground">{phrase.phrase}</p>     {" "}
      </div>
         {" "}
    </li>
  );
};

export default function ErrorReviewScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getErrorArray } = useErrorPool();
  const errors = getErrorArray();

  return (
    <div className="w-full h-full flex flex-col max-w-3xl min-w-[320px] mx-auto overflow-hidden">
      {/* Фіксований хедер */}{" "}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        {" "}
        <div className="flex items-center gap-2 mb-3">
          <BackButton to="/" />{" "}
          <h2 className="text-xl font-bold text-foreground">
            {t("error_review_title", "Перегляд помилок")} ({errors.length}){" "}
          </h2>{" "}
        </div>{" "}
      </div>
      {/* Скролована зона */}{" "}
      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        {" "}
        {errors.length === 0 ? (
          <div className="text-center text-muted-foreground p-8 bg-card rounded-xl shadow">
            {t("error_pool_empty", "Вітаємо, у вас немає помилок!")}{" "}
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {" "}
            {errors.map((phrase) => (
              <ErrorPhraseItem key={phrase.id} phrase={phrase} />
            ))}{" "}
          </ul>
        )}{" "}
      </div>{" "}
    </div>
  );
}

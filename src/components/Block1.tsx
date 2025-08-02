import React, { useState, useEffect } from "react";
import ExerciseBlockContainer from "./ExerciseBlockContainer";
import TextSpeechHighlighter from "./TextSpeechHighlighter";
import { User } from "../types";
import { useTranslation } from "react-i18next";

interface Thousand {
  id: number;
  name: string;
  description?: string | null;
}

interface WordSet {
  id: number;
  word_set: string;
  name?: string;
}

type WordItem = Word | string;

interface Word {
  id: number;
  word: string;
}

interface ExerciseMeta {
  id: number;
  exercise_name?: string;
  name?: string;
  title?: string;
}

interface ExerciseDetails {
  theory: string;
  data: any[];
  exercise_name?: string;
  name?: string;
  title?: string;
  error?: string;
}

interface ReadingTitle {
  id: number;
  title: string;
}

interface ReadingText {
  text: string;
  translation: string;
}

interface Language {
  id: number;
  code: string;
  name: string;
}

interface Block1Props {
  user: User | null;
  learningLanguage: Language | null;
}

function ConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 shadow-xl w-80 max-w-full">
        <h3 className="font-bold text-lg mb-4 text-center">
          {t("confirm_exit_title")}
        </h3>
        <div className="mb-4 text-gray-700 text-center">
          {t("confirm_exit_text")}
        </div>
        <div className="flex justify-end gap-4">
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            onClick={onCancel}
          >
            {t("cancel")}
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 border border-blue-200"
            onClick={onConfirm}
          >
            {t("exit")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Block1({ user, learningLanguage }: Block1Props) {
  const { t } = useTranslation();

  const [thousands, setThousands] = useState<Thousand[]>([]);
  const [selectedThousandId, setSelectedThousandId] = useState<number | null>(
    null
  );
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);

  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [readingTitles, setReadingTitles] = useState<ReadingTitle[]>([]);
  const [exercisesMeta, setExercisesMeta] = useState<ExerciseMeta[]>([]);
  const [selectedReadingId, setSelectedReadingId] = useState<number | null>(
    null
  );
  const [readingText, setReadingText] = useState<ReadingText | null>(null);
  const [activeTab, setActiveTab] = useState<"words" | "reading" | "exercises">(
    "words"
  );

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    null
  );
  const [exerciseDetails, setExerciseDetails] =
    useState<ExerciseDetails | null>(null);
  const [loadingExerciseDetails, setLoadingExerciseDetails] =
    useState<boolean>(false);

  const [showConfirmExit, setShowConfirmExit] = useState<boolean>(false);

  const [loadingThousands, setLoadingThousands] = useState<boolean>(true);
  const [loadingWordSets, setLoadingWordSets] = useState<boolean>(false);
  const [loadingWords, setLoadingWords] = useState<boolean>(false);
  const [loadingReadings, setLoadingReadings] = useState<boolean>(false);
  const [loadingExercises, setLoadingExercises] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!learningLanguage) {
      setThousands([]);
      return;
    }
    setLoadingThousands(true);
    fetch(`/api/thousands?language_id=${learningLanguage.id}`)
      .then((r) => r.json())
      .then((data) => {
        setThousands(Array.isArray(data.data) ? data.data : []);
        setLoadingThousands(false);
      })
      .catch(() => {
        setThousands([]);
        setLoadingThousands(false);
        setError(t("error_loading_thousands"));
      });
  }, [learningLanguage, t]);

  useEffect(() => {
    if (selectedThousandId) {
      setLoadingWordSets(true);
      fetch(`/api/thousands/${selectedThousandId}/word-sets`)
        .then((r) => r.json())
        .then((data) => {
          setWordSets(Array.isArray(data.data) ? data.data : []);
          setLoadingWordSets(false);
        })
        .catch(() => {
          setWordSets([]);
          setLoadingWordSets(false);
          setError(t("error_loading_word_sets"));
        });
      setSelectedSetId(null);
      setAllWords([]);
      setReadingTitles([]);
      setExercisesMeta([]);
      setReadingText(null);
      setSelectedReadingId(null);
      setActiveTab("words");
      setSelectedExerciseId(null);
      setExerciseDetails(null);
    }
  }, [selectedThousandId, t]);

  useEffect(() => {
    if (selectedSetId) {
      setLoadingWords(true);
      setLoadingReadings(true);
      setLoadingExercises(true);

      fetch(`/api/word-sets/${selectedSetId}/words`)
        .then((r) => r.json())
        .then((data) => {
          setAllWords(
            Array.isArray(data) ? data : data.words || data.data || []
          );
        })
        .catch(() => setAllWords([]))
        .finally(() => setLoadingWords(false));

      fetch(`/api/word-sets/${selectedSetId}/texts`)
        .then((r) => r.json())
        .then((data) => {
          setReadingTitles(Array.isArray(data) ? data : data.data || []);
        })
        .catch(() => setReadingTitles([]))
        .finally(() => setLoadingReadings(false));

      fetch(`/api/word-sets/${selectedSetId}/exercises`)
        .then((r) => r.json())
        .then((data) => {
          setExercisesMeta(Array.isArray(data) ? data : data.data || []);
        })
        .catch(() => setExercisesMeta([]))
        .finally(() => setLoadingExercises(false));

      setReadingText(null);
      setSelectedReadingId(null);
      setActiveTab("words");
      setSelectedExerciseId(null);
      setExerciseDetails(null);
    }
  }, [selectedSetId]);

  useEffect(() => {
    if (
      activeTab === "reading" &&
      readingTitles.length > 0 &&
      !selectedReadingId
    ) {
      handleSelectReading(readingTitles[0].id);
    }
    // eslint-disable-next-line
  }, [activeTab, readingTitles]);

  const handleSelectReading = async (readingId: number) => {
    setSelectedReadingId(readingId);
    setReadingText(null);
    if (readingId) {
      const res = await fetch(`/api/texts/${readingId}`);
      const data = await res.json();
      setReadingText(data.data || { text: "", translation: "" });
    }
  };

  const handleSelectExercise = async (exerciseId: number) => {
    setSelectedExerciseId(exerciseId);
    setLoadingExerciseDetails(true);
    setExerciseDetails(null);
    if (exerciseId && selectedSetId) {
      try {
        const res = await fetch(
          `/api/word-sets/${selectedSetId}/exercises/${exerciseId}`
        );
        const data = await res.json();
        setExerciseDetails(data);
      } catch {
        setExerciseDetails({
          error: t("failed_to_load_exercise"),
        } as ExerciseDetails);
      }
      setLoadingExerciseDetails(false);
    }
  };

  const handleRequestExitExercise = () => setShowConfirmExit(true);
  const handleCancelExitExercise = () => setShowConfirmExit(false);
  const handleConfirmExitExercise = () => {
    setShowConfirmExit(false);
    setSelectedExerciseId(null);
    setExerciseDetails(null);
    setLoadingExerciseDetails(false);
  };

  if (!selectedThousandId) {
    if (loadingThousands) {
      return (
        <div className="p-4 w-full max-w-full sm:max-w-2xl md:max-w-3xl min-w-0 mx-auto">
          <div className="text-center text-gray-400 text-lg">
            {t("loading_thousands")}
          </div>
        </div>
      );
    }
    return (
      <div className="p-4 w-full max-w-full sm:max-w-2xl md:max-w-3xl min-w-0 mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">
          {t("select_thousand_words")}
        </h2>
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
        <div className="flex flex-wrap gap-4 justify-center">
          {thousands.length > 0 ? (
            thousands.map((thousand) => (
              <button
                key={thousand.id}
                onClick={() => setSelectedThousandId(thousand.id)}
                className="px-6 py-3 rounded-xl bg-white border shadow hover:bg-blue-100 transition text-lg font-semibold"
              >
                {thousand.name}
                <div className="text-sm text-gray-500">
                  {thousand.description}
                </div>
              </button>
            ))
          ) : (
            <div className="text-gray-400 text-center my-10">
              {t("empty_thousands_list")}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedSetId) {
    if (loadingWordSets) {
      return (
        <div className="p-4 w-full max-w-full sm:max-w-2xl md:max-w-3xl min-w-0 mx-auto">
          <div className="text-center text-gray-400 text-lg">
            {t("loading_word_sets")}
          </div>
        </div>
      );
    }
    return (
      <div className="p-4 w-full max-w-full sm:max-w-2xl md:max-w-3xl min-w-0 mx-auto">
        <button
          className="mb-6 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          onClick={() => setSelectedThousandId(null)}
        >
          {t("back_to_thousands")}
        </button>
        <h2 className="text-xl font-bold mb-4 text-blue-700 text-center">
          {t("select_word_set")}
        </h2>
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 justify-center items-stretch">
          {wordSets.length > 0 &&
            wordSets.map((set) => (
              <button
                key={set.id}
                onClick={() => setSelectedSetId(set.id)}
                className="h-28 w-full flex flex-col justify-center items-center px-4 py-3 rounded-xl bg-white border shadow hover:bg-blue-100 transition min-w-[120px] min-h-[70px] text-base font-semibold"
                style={{ aspectRatio: "1.2/1", maxWidth: 260 }}
              >
                {set.word_set || set.name || `Set #${set.id}`}
              </button>
            ))}
          {wordSets.length === 0 && (
            <div className="text-gray-400 text-center my-10">
              {t("empty_word_sets_list")}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (selectedExerciseId && exerciseDetails) {
    return (
      // <div className="p-2 sm:p-4 w-full max-w-3xl min-w-[360px] mx-auto flex flex-col min-h-[60vh] justify-between">
      <div className="p-2 sm:p-4 w-full max-w-full sm:max-w-2xl md:max-w-3xl min-w-0 mx-auto flex flex-col min-h-[60vh] justify-between">
        <div className="flex justify-end mb-6">
          <button
            onClick={handleRequestExitExercise}
            className="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 border border-blue-200 shadow text-sm"
          >
            {t("finish_exercise")}
          </button>
        </div>
        <div className="flex-1">
          {loadingExerciseDetails ? (
            <div className="text-gray-400 text-center my-6">
              {t("loading_exercise")}
            </div>
          ) : exerciseDetails.error ? (
            <div className="text-red-500">{exerciseDetails.error}</div>
          ) : (
            <ExerciseBlockContainer
              theoryText={exerciseDetails.theory}
              exerciseData={exerciseDetails.data}
              title={
                exerciseDetails.exercise_name ||
                exerciseDetails.name ||
                exerciseDetails.title
              }
            />
          )}
        </div>
        <ConfirmModal
          open={showConfirmExit}
          onCancel={handleCancelExitExercise}
          onConfirm={handleConfirmExitExercise}
        />
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 w-full max-w-3xl min-w-[360px] mx-auto">
      <button
        className="mb-6 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
        onClick={() => setSelectedSetId(null)}
      >
        {t("back_to_word_sets")}
      </button>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("words")}
          className={`px-4 py-2 rounded-t-xl font-semibold transition-all border-b-4 ${
            activeTab === "words"
              ? "bg-white text-blue-700 border-blue-500 shadow"
              : "bg-blue-100 text-gray-500 border-transparent hover:bg-blue-200"
          }`}
        >
          {t("tab_all_words")}
        </button>
        <button
          onClick={() => setActiveTab("reading")}
          className={`px-4 py-2 rounded-t-xl font-semibold transition-all border-b-4 ${
            activeTab === "reading"
              ? "bg-white text-blue-700 border-blue-500 shadow"
              : "bg-blue-100 text-gray-500 border-transparent hover:bg-blue-200"
          }`}
        >
          {t("tab_reading")}
        </button>
        <button
          onClick={() => setActiveTab("exercises")}
          className={`px-4 py-2 rounded-t-xl font-semibold transition-all border-b-4 ${
            activeTab === "exercises"
              ? "bg-white text-blue-700 border-blue-500 shadow"
              : "bg-blue-100 text-gray-500 border-transparent hover:bg-blue-200"
          }`}
        >
          {t("tab_exercises")}
        </button>
      </div>
      <div>
        {activeTab === "words" && (
          <div className="mb-6">
            {loadingWords ? (
              <div className="text-gray-400 text-center my-8">
                {t("loading_words")}
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {allWords.map((w, idx) => (
                  <li
                    key={typeof w === "object" && "id" in w ? w.id : idx}
                    className="px-2 py-1 rounded bg-blue-50 border"
                  >
                    {typeof w === "object" && "word" in w ? w.word : w}
                  </li>
                ))}
                {allWords.length === 0 && (
                  <div className="text-gray-400 text-center my-8">
                    {t("no_words_for_set")}
                  </div>
                )}
              </ul>
            )}
          </div>
        )}
        {activeTab === "reading" && (
          <div className="mb-6">
            {loadingReadings ? (
              <div className="text-gray-400 text-center my-8">
                {t("loading_readings")}
              </div>
            ) : (
              <>
                {readingTitles.length > 0 ? (
                  <div className="mb-4 w-full relative">
                    <select
                      value={selectedReadingId || readingTitles[0].id}
                      onChange={(e) =>
                        handleSelectReading(Number(e.target.value))
                      }
                      className="block w-full p-2 pr-10 rounded border text-base bg-white appearance-none focus:outline-none"
                      style={{
                        minWidth: 0,
                        maxWidth: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {readingTitles.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.title}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M6 8l4 4 4-4"
                          stroke="#666"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-center my-8">
                    {t("no_texts_for_set")}
                  </div>
                )}

                {selectedReadingId && readingText ? (
                  <div className="my-6">
                    <TextSpeechHighlighter
                      text={readingText.text}
                      translation={readingText.translation}
                    />
                  </div>
                ) : readingTitles.length > 0 ? (
                  <div className="text-gray-400 text-center my-8">
                    {t("loading_text")}
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
        {activeTab === "exercises" && (
          <div className="mb-6">
            {loadingExercises ? (
              <div className="text-gray-400 text-center my-8">
                {t("loading_exercises")}
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {exercisesMeta.map((ex) => (
                  <li
                    key={ex.id}
                    className="px-4 py-2 rounded border bg-white shadow text-left cursor-pointer hover:bg-blue-50"
                    onClick={() => handleSelectExercise(ex.id)}
                  >
                    {ex.exercise_name || ex.name || ex.title || ex.id}
                  </li>
                ))}
                {exercisesMeta.length === 0 && (
                  <div className="text-gray-400 text-center my-8">
                    {t("no_exercises_for_set")}
                  </div>
                )}
              </ul>
            )}
            {loadingExerciseDetails && (
              <div className="text-gray-400 text-center my-6">
                {t("loading_exercise")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

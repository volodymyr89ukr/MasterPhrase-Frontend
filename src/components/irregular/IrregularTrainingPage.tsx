import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BackButton from "../BackButton";
import { CategoryCard } from "./CategoryCard";
import { Category, ProgressData } from "./types";
import { EmptyState } from "../ui/EmptyState";
import { useIrregularProgress } from "../../contexts/IrregularProgressContext"; // ← ДОДАТИ

// 🔥 TODO: В Частині 3 замінимо на реальні дані
const MOCK_CATEGORIES: Category[] = [
  {
    id: "nouns",
    title: "Артиклі і множина іменників",
    description: "3000 слів (розділено на блоки по 10–20)",
    icon: "📘",
    totalItems: 3000,
    blocks: [], // Заповнимо в Частині 3
    progress: 40,
  },
  {
    id: "strong-verbs",
    title: "3 форми сильних дієслів",
    description: "200 дієслів у 20 блоках",
    icon: "🚀",
    totalItems: 200,
    blocks: [],
    progress: 15,
  },
  {
    id: "conjugations",
    title: "Відмінювання сильних дієслів",
    description: "Тренування Präsens",
    icon: "🔄",
    totalItems: 150,
    blocks: [],
    progress: 0,
  },
];

const STORAGE_KEY = "mp_irregular_progress";

export default function IrregularTrainingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getCategoryProgress } = useIrregularProgress();
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [progress, setProgress] = useState<ProgressData>({});

  // Завантаження прогресу з LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProgress(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load progress:", error);
    }
  }, []);

  // Оновлення прогресу категорій на основі збережених даних
  useEffect(() => {
    const updated = categories.map((cat) => {
      const newProgress = getCategoryProgress(cat.id, cat.blocks.length || 1);
      return { ...cat, progress: newProgress };
    });
    setCategories(updated);
  }, [getCategoryProgress]);

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BackButton to="/" />
            <h1 className="text-3xl font-bold text-foreground">
              📚 {t("irregular_training", "Граматичні форми")}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-14">
            {t(
              "irregular_description",
              "Вивчай артиклі, множину, сильні дієслова та їх відмінювання"
            )}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {categories.length === 0 ? (
            <EmptyState
              icon={<span className="text-6xl">📚</span>}
              title={t("no_categories", "Немає доступних категорій")}
              description={t(
                "no_categories_desc",
                "Категорії з'являться пізніше"
              )}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

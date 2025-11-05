import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BackButton from "../BackButton";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Category, Level, IrregularBlock } from "./types";
import { useIrregularProgress } from "../../contexts/IrregularProgressContext";

interface CategoryViewProps {
  categories: Category[];
}

const levelColors: Record<Level, string> = {
  A1: "bg-green-500",
  A2: "bg-blue-500",
  B1: "bg-orange-500",
  B2: "bg-red-500",
};

export default function CategoryView({ categories }: CategoryViewProps) {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isBlockCompleted, getCategoryProgress } = useIrregularProgress();

  const [selectedLevel, setSelectedLevel] = useState<Level | "all">("all");
  const [blockSize, setBlockSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("mp_irregular_block_size");
      return saved ? parseInt(saved, 10) : 10;
    } catch {
      return 10;
    }
  });

  const category = categories.find((c) => c.id === categoryId);

  const filteredBlocks = useMemo(() => {
    if (!category) return [];
    if (selectedLevel === "all") return category.blocks;
    return category.blocks.filter((block) => block.level === selectedLevel);
  }, [category, selectedLevel]);

  const availableLevels = useMemo(() => {
    if (!category) return [];
    const levels = new Set<Level>();
    category.blocks.forEach((block) => levels.add(block.level));
    return Array.from(levels).sort();
  }, [category]);

  const handleBlockSizeChange = (size: number) => {
    setBlockSize(size);
    localStorage.setItem("mp_irregular_block_size", String(size));
    // TODO: В Частині 3 додамо перегенерацію блоків
  };

  const handleStartBlock = (blockId: number) => {
    navigate(`/irregular/${categoryId}/block/${blockId}`);
  };

  const handleRandomBlock = () => {
    if (!filteredBlocks.length) return;
    const uncompletedBlocks = filteredBlocks.filter(
      (block) => !isBlockCompleted(categoryId!, block.id)
    );
    const pool =
      uncompletedBlocks.length > 0 ? uncompletedBlocks : filteredBlocks;
    const randomBlock = pool[Math.floor(Math.random() * pool.length)];
    handleStartBlock(randomBlock.id);
  };

  if (!category) {
    return (
      <div className="w-full h-full flex flex-col bg-background overflow-hidden">
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
          <div className="max-w-5xl mx-auto">
            <BackButton to="/irregular" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<span className="text-6xl">❓</span>}
            title={t("category_not_found", "Категорію не знайдено")}
            description={t(
              "category_not_found_desc",
              "Повернутися до списку категорій"
            )}
          />
        </div>
      </div>
    );
  }

  const progress = getCategoryProgress(categoryId!, category.blocks.length);

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <BackButton to="/irregular" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{category.icon}</span>
                <h1 className="text-2xl font-bold text-foreground">
                  {category.title}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground ml-11">
                {category.description}
              </p>
            </div>
          </div>

          {/* Прогрес */}
          <div className="mb-3">
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>{t("progress", "Прогрес")}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Фільтри та налаштування */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Фільтр по рівнях */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("level", "Рівень")}:
              </span>
              <button
                onClick={() => setSelectedLevel("all")}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  selectedLevel === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {t("all", "Всі")}
              </button>
              {availableLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-3 py-1 rounded text-xs font-bold text-white transition-opacity ${
                    levelColors[level]
                  } ${selectedLevel === level ? "opacity-100" : "opacity-60"}`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Розмір блоку */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("block_size", "Розмір блоку")}:
              </span>
              {[6, 10, 12, 16].map((size) => (
                <button
                  key={size}
                  onClick={() => handleBlockSizeChange(size)}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                    blockSize === size
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Випадковий блок */}
            <Button
              onClick={handleRandomBlock}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              🎲 {t("random_block", "Випадковий блок")}
            </Button>
          </div>
        </div>
      </div>

      {/* Список блоків */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
        <div className="max-w-5xl mx-auto">
          {filteredBlocks.length === 0 ? (
            <EmptyState
              icon={<span className="text-6xl">📦</span>}
              title={t("no_blocks", "Немає блоків")}
              description={t(
                "no_blocks_desc",
                "Спробуйте змінити фільтр рівня"
              )}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredBlocks.map((block) => {
                const completed = isBlockCompleted(categoryId!, block.id);
                return (
                  <Card
                    key={block.id}
                    className={`hover:shadow-lg transition-shadow cursor-pointer ${
                      completed ? "border-green-500 border-2" : ""
                    }`}
                    onClick={() => handleStartBlock(block.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {t("block", "Блок")} {block.id + 1}
                        </CardTitle>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                            levelColors[block.level]
                          }`}
                        >
                          {block.level}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground mb-2">
                        {block.items.length}{" "}
                        {t("items", "елементів").toLowerCase()}
                      </div>
                      <div className="text-2xl text-center">
                        {completed ? "✅" : "▶️"}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

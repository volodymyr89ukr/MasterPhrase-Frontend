import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

interface BlockCompletionScreenProps {
  categoryId: string;
  currentBlockId: number;
  totalBlocks: number;
  onRepeat: () => void;
  onNext: () => void;
  onBackToCategory: () => void;
}

export function BlockCompletionScreen({
  categoryId,
  currentBlockId,
  totalBlocks,
  onRepeat,
  onNext,
  onBackToCategory,
}: BlockCompletionScreenProps) {
  const { t } = useTranslation();
  const hasNextBlock = currentBlockId < totalBlocks - 1;

  return (
    <div className="w-full h-full flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full animate-fade-in">
        <CardHeader>
          <div className="text-center mb-4">
            <div className="text-6xl mb-4 animate-bounce">✅</div>
            <CardTitle className="text-2xl">
              {t("block_completed", "Блок завершено!")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              onClick={onRepeat}
              variant="outline"
              className="w-full"
              size="lg"
            >
              🔁 {t("repeat_block", "Повторити цей блок")}
            </Button>

            {hasNextBlock ? (
              <Button onClick={onNext} className="w-full" size="lg">
                ⏭ {t("next_block", "Наступний блок")}
              </Button>
            ) : (
              <Button onClick={onBackToCategory} className="w-full" size="lg">
                📚 {t("back_to_category", "Повернутися до категорії")}
              </Button>
            )}

            <Button
              onClick={onBackToCategory}
              variant="ghost"
              className="w-full"
              size="sm"
            >
              {t("choose_another_block", "Вибрати інший блок")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

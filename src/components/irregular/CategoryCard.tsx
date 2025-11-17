import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/Card";
import { Button } from "../ui/Button";
import { Category, Level } from "./types";

interface CategoryCardProps {
  category: Category;
}

const levelColors: Record<Level, string> = {
  A1: "bg-green-500",
  A2: "bg-blue-500",
  B1: "bg-orange-500",
  B2: "bg-red-500",
};

const levelLabels: Record<Level, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
};

export function CategoryCard({ category }: CategoryCardProps) {
  const navigate = useNavigate();

  const progressColor =
    category.progress >= 75
      ? "bg-green-500"
      : category.progress >= 50
      ? "bg-blue-500"
      : category.progress >= 25
      ? "bg-orange-500"
      : "bg-gray-400";

  // Визначаємо рівні, які є в цій категорії
  const levels = Array.from(
    new Set(category.blocks.flatMap((b) => b.items.map((i) => i.level)))
  );

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{category.icon}</div>
            <CardTitle className="text-xl">{category.title}</CardTitle>
          </div>
          {/* Badges рівнів */}
          <div className="flex gap-1">
            {levels.map((level) => (
              <span
                key={level}
                className={`px-2 py-1 rounded text-xs font-bold text-white ${levelColors[level]}`}
                title={levelLabels[level]}
              >
                {level}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {category.description}
        </p>

        {/* Прогрес-бар */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Прогрес</span>
            <span>{category.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${progressColor}`}
              style={{ width: `${category.progress}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {category.totalItems} елементів у {category.blocks.length} блоках
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => {
            if (category.id === "nouns") {
              navigate("/nouns");
            } else {
              navigate(`/irregular/${category.id}`);
            }
          }}
          className="w-full"
          size="lg"
        >
          ▶️ Почати
        </Button>
      </CardFooter>
    </Card>
  );
}

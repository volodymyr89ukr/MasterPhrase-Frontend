import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface SpeakerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (speed: number, pauseBetweenItems: number) => void;
  initialSpeed: number;
  initialPause: number;
}

export function SpeakerSettings({
  isOpen,
  onClose,
  onConfirm,
  initialSpeed,
  initialPause,
}: SpeakerSettingsProps) {
  const { t } = useTranslation();

  const [localSpeed, setLocalSpeed] = useState(initialSpeed);
  const [localPause, setLocalPause] = useState(initialPause);

  useEffect(() => {
    if (isOpen) {
      setLocalSpeed(initialSpeed);
      setLocalPause(initialPause);
    }
  }, [isOpen, initialSpeed, initialPause]);

  if (!isOpen) return null;

  const speedOptions = [
    { value: 0.7, label: "🐢", desc: t("very_slow", "Повільно") },
    { value: 0.85, label: "🚶", desc: t("medium", "Нормально") },
    { value: 1.0, label: "🐇", desc: t("fast", "Швидко") },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Settings Modal */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl shadow-2xl z-50 animate-slide-up p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-foreground mb-4">
            ⚙️ {t("settings", "Налаштування")}
          </h3>

          {/* Швидкість озвучування */}
          <div className="mb-5">
            <div className="font-semibold mb-2 text-foreground text-sm">
              {t("reading_speed", "Швидкість озвучування")}
            </div>
            <div className="flex gap-3">
              {speedOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLocalSpeed(option.value)}
                  className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all ${
                    localSpeed === option.value
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                  title={option.desc}
                >
                  <div className="text-2xl mb-1">{option.label}</div>
                  <div className="text-xs">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Пауза між елементами */}
          <div className="mb-5">
            <div className="font-semibold mb-2 flex items-center justify-between text-foreground text-sm">
              <span>{t("pause_between_items", "Пауза між елементами")}</span>
              <span className="text-primary font-mono">
                {(localPause / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-8 text-right">
                0s
              </span>
              <input
                type="range"
                min={0}
                max={3000}
                step={100}
                value={localPause}
                onChange={(e) => setLocalPause(Number(e.target.value))}
                className="flex-1 accent-primary h-2"
              />
              <span className="text-xs text-muted-foreground w-8 text-left">
                3s
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {t(
                "pause_hint",
                "Час очікування після озвучування кожного елемента"
              )}
            </div>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            {t("cancel", "Скасувати")}
          </Button>
          <Button
            onClick={() => onConfirm(localSpeed, localPause)}
            className="flex-1"
            size="lg"
          >
            {t("apply", "Застосувати")}
          </Button>
        </div>
      </div>
    </>
  );
}

// Простий Button для цього компонента (якщо не імпортується з ui/Button)
function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}) {
  const baseClass =
    "rounded-lg font-semibold transition-all disabled:opacity-50";
  const variantClass =
    variant === "outline"
      ? "border-2 border-border bg-transparent hover:bg-accent"
      : variant === "ghost"
      ? "bg-transparent hover:bg-accent"
      : "bg-primary text-primary-foreground hover:bg-primary/90";
  const sizeClass =
    size === "sm"
      ? "px-3 py-1.5 text-sm"
      : size === "lg"
      ? "px-6 py-3"
      : "px-4 py-2";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
    >
      {children}
    </button>
  );
}

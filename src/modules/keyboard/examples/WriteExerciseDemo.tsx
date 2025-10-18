import React, { useState } from "react";
import { useInputEngine } from "../engine/useInputEngine";
import { useTouchDetection } from "../hooks/useTouchDetection";
import CustomKeyboard from "../ui/CustomKeyboard";
import { enLayout } from "../layouts/en";
import { deLayout } from "../layouts/de";
import { esLayout } from "../layouts/es";
import { symbolsLayout } from "../layouts/symbols";
import { KeySpec } from "../types";

export default function WriteExerciseDemo() {
  const { isTouchDevice, userOverride, setUserOverride } = useTouchDetection();
  const engine = useInputEngine({
    initialLayout: "de",
    onEnter: (val) => alert(`Submitted: ${val}`),
  });

  const [showLangPicker, setShowLangPicker] = useState(false);

  const layouts = {
    en: enLayout,
    de: deLayout,
    es: esLayout,
    symbols: symbolsLayout,
  };

  const currentLayout = engine.symbols
    ? symbolsLayout
    : layouts[engine.layoutId];

  const handleKey = (spec: KeySpec) => {
    if (spec.type === "char") {
      engine.insert(spec.value || spec.label);
    } else {
      switch (spec.action) {
        case "Backspace":
          engine.backspace();
          break;
        case "Enter":
          engine.enter();
          break;
        case "Space":
          engine.space();
          break;
        case "Shift":
          engine.toggleShift();
          break;
        case "Symbols":
          engine.setSymbols(!engine.symbols);
          break;
        case "Switch":
          setShowLangPicker((s) => !s);
          break;
      }
    }
  };

  const handleSelectVariant = (variant: string) => {
    engine.insert(variant);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">
          Custom Keyboard Demo
        </h1>
        <p className="text-sm text-muted-foreground">
          Touch: {isTouchDevice ? "Yes" : "No"} (Override:{" "}
          {userOverride !== null ? String(userOverride) : "Auto"})
        </p>
        <button
          onClick={() =>
            setUserOverride(userOverride === null ? !isTouchDevice : null)
          }
          className="mt-2 px-3 py-1 rounded bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
        >
          Toggle Keyboard Mode
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!isTouchDevice ? (
          <input
            type="text"
            value={engine.value}
            onChange={(e) => {
              // Sync desktop input to engine
              const newVal = e.target.value;
              engine.reset();
              for (const ch of newVal) {
                engine.insert(ch);
              }
            }}
            className="w-full max-w-md px-4 py-3 rounded-lg border-2 border-input bg-card text-foreground text-lg focus:border-ring focus:ring-2 focus:ring-ring transition-all"
            placeholder="Type here..."
          />
        ) : (
          <div
            role="textbox"
            aria-readonly="true"
            aria-live="polite"
            className="w-full max-w-md px-4 py-3 rounded-lg border-2 border-input bg-card text-foreground text-lg min-h-[52px]"
          >
            {engine.value}
            <span className="animate-pulse">|</span>
          </div>
        )}
      </div>

      {isTouchDevice && (
        <CustomKeyboard
          layout={currentLayout}
          shift={engine.shift}
          onKey={handleKey}
          onSelectVariant={handleSelectVariant}
        />
      )}

      {showLangPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              Select Language
            </h3>
            <div className="flex gap-2">
              {(["en", "de", "es"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    engine.setLayout(lang);
                    setShowLangPicker(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-secondary-foreground font-semibold transition-colors"
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

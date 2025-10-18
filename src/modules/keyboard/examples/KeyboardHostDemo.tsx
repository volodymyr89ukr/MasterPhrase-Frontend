import React, { useState } from "react";
import type { DensityTier } from "../hooks/useKeyboardAutosize";
import { useInputEngine } from "../engine/useInputEngine";
import { useTouchDetection } from "../hooks/useTouchDetection";
import { useVisualViewportInset } from "../hooks/useVisualViewportInset";
import CustomKeyboard from "../ui/CustomKeyboard";
import KeyboardSheet from "../ui/KeyboardSheet";
import { enLayout } from "../layouts/en";
import { deLayout } from "../layouts/de";
import { esLayout } from "../layouts/es";
import { symbolsLayout } from "../layouts/symbols";
import { KeySpec } from "../types";

export default function KeyboardHostDemo() {
  const { isTouchDevice, setUserOverride } = useTouchDetection();
  const { bottomInset } = useVisualViewportInset();

  const [keyboardDensity, setKeyboardDensity] =
    useState<DensityTier>("comfort");

  const engine = useInputEngine({
    initialLayout: "de",
    onEnter: (val) => alert(`Submitted: ${val}`),
  });

  const [showLangPicker, setShowLangPicker] = useState(false);
  const [density, setDensity] = useState<"comfort" | "compact">("comfort");

  const layouts = {
    en: enLayout,
    de: deLayout,
    es: esLayout,
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
    <div
      className="flex flex-col h-screen bg-background"
      style={{ paddingBottom: isTouchDevice ? `${bottomInset}px` : 0 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground">
          Keyboard Host Demo
        </h1>
        <p className="text-sm text-muted-foreground">
          Touch: {isTouchDevice ? "Yes" : "No"}
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setUserOverride((o) => (o === null ? true : null))}
            className="px-3 py-1 rounded bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            Toggle Keyboard Mode
          </button>
          <div className="px-3 py-1 rounded bg-secondary text-secondary-foreground">
            Auto Density: {keyboardDensity}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {!isTouchDevice ? (
          <input
            type="text"
            value={engine.value}
            onChange={(e) => {
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
            tabIndex={-1}
            className="w-full max-w-md px-4 py-3 rounded-2xl bg-[#111418] text-white text-xl min-h-[56px] flex items-center"
          >
            {engine.value || <span className="opacity-50">Enter the word</span>}
            <span className="animate-pulse ml-1">|</span>
          </div>
        )}
      </div>

      {/* Keyboard */}
      {isTouchDevice && (
        <KeyboardSheet onDensityChange={setKeyboardDensity}>
          <CustomKeyboard
            layout={currentLayout}
            shift={engine.shift}
            density={keyboardDensity}
            onKey={handleKey}
            onSelectVariant={handleSelectVariant}
          />
        </KeyboardSheet>
      )}

      {/* Language Picker Modal */}
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
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    engine.layoutId === lang
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary hover:bg-accent text-secondary-foreground"
                  }`}
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

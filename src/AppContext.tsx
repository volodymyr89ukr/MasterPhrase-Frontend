import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";
import { ProgressProvider, useProgress } from "./contexts/ProgressContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ErrorPoolProvider } from "./contexts/ErrorPoolContext";
import { IrregularProgressProvider } from "./contexts/IrregularProgressContext"; // ← ДОДАТИ

// Re-export hooks для зворотної сумісності
export { useAuth } from "./contexts/AuthContext";
export { useSettings } from "./contexts/SettingsContext";
export { useProgress } from "./contexts/ProgressContext";
export type { Language } from "./contexts/SettingsContext";
export { useErrorPool } from "./contexts/ErrorPoolContext";
export { useIrregularProgress } from "./contexts/IrregularProgressContext"; // ← ДОДАТИ

// ✅ Композиція всіх контекстів
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <ProgressProvider>
            <ErrorPoolProvider>
              <IrregularProgressProvider>{children}</IrregularProgressProvider>
            </ErrorPoolProvider>
          </ProgressProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

// Legacy hook для поступової міграції (deprecated)
export function useAppContext() {
  console.warn(
    "useAppContext is deprecated. Use useAuth/useSettings/useProgress instead."
  );
  const auth = useAuth();
  const settings = useSettings();
  const progress = useProgress();
  return { ...auth, ...settings, ...progress };
}

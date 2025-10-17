// src/components/ui/TransitionScreen.tsx
import { cn } from "../../lib/utils";

interface TransitionScreenProps {
  icon?: string;
  title: string;
  description?: string;
  className?: string;
}

export function TransitionScreen({
  icon = "✅",
  title,
  description,
  className,
}: TransitionScreenProps) {
  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center bg-background overflow-y-auto animate-fade-in",
        className
      )}
    >
      <div className="text-center max-w-md px-4">
        <div className="text-6xl mb-4 animate-bounce">{icon}</div>
        <h2 className="text-2xl font-semibold mb-2 text-foreground">{title}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

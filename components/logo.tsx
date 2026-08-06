import { HardHat } from "./icons";

export function Logo({ onDark = false, size = "md" }: { onDark?: boolean; size?: "md" | "lg" }) {
  const badge = size === "lg" ? "h-16 w-16 rounded-2xl" : "h-10 w-10 rounded-xl";
  const hat = size === "lg" ? "h-10 w-10" : "h-6 w-6";
  const text = size === "lg" ? "text-3xl" : "text-xl";
  return (
    <div className="flex items-center gap-3">
      <span className={`grid place-items-center bg-accent ${badge}`}>
        <HardHat className={`text-brand ${hat}`} />
      </span>
      <span className={`font-bold ${text} ${onDark ? "text-white" : "text-brand"}`}>
        MeAjuda <span className="text-accent">Aí</span>
      </span>
    </div>
  );
}

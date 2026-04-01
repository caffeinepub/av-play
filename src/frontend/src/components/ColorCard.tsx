import { getColorConfig } from "../utils/gameUtils";

interface ColorCardProps {
  color: "red" | "green" | "violet";
  multiplier: number;
  totalBets: bigint;
  isSelected: boolean;
  isWinner: boolean;
  isReveal: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function ColorCard({
  color,
  multiplier,
  totalBets,
  isSelected,
  isWinner,
  isReveal,
  disabled,
  onClick,
}: ColorCardProps) {
  const cfg = getColorConfig(color);
  const isFlashing = isReveal && isWinner;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-ocid={`trade.${color}_card.button`}
      className={[
        "relative flex flex-col items-center justify-center gap-1.5 rounded-xl p-4 border-2 transition-all duration-200 w-full",
        "cursor-pointer select-none outline-none",
        cfg.bg,
        isSelected ? `${cfg.border} scale-105` : "border-border/40",
        isFlashing ? cfg.flashClass : "",
        disabled && !isSelected ? "opacity-60 cursor-not-allowed" : "",
        isSelected ? "ring-2 ring-offset-1 ring-offset-background" : "",
        color === "green" && isSelected ? "ring-neon-green/50" : "",
        color === "violet" && isSelected ? "ring-neon-violet/50" : "",
        color === "red" && isSelected ? "ring-neon-red/50" : "",
        !disabled ? "hover:scale-105" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
        style={{
          background: `radial-gradient(circle, ${cfg.hex}33 0%, ${cfg.hex}11 70%)`,
          border: `2px solid ${cfg.hex}66`,
          boxShadow:
            isSelected || isFlashing ? `0 0 20px ${cfg.hex}66` : "none",
        }}
      >
        {cfg.emoji}
      </div>
      <span
        className={`text-sm font-bold uppercase tracking-wider ${cfg.text}`}
      >
        {cfg.label}
      </span>
      <div className="flex flex-col items-center gap-0.5">
        <span
          className={`text-xl font-black ${cfg.text}`}
          style={{ textShadow: `0 0 10px ${cfg.hex}66` }}
        >
          {multiplier}x
        </span>
        <span className="text-[10px] text-muted-foreground">multiplier</span>
      </div>
      <div className="text-[11px] text-muted-foreground font-medium">
        {Number(totalBets).toLocaleString()} coins bet
      </div>
      {isWinner && isReveal && (
        <div
          className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: cfg.hex, color: "#0B0F14" }}
        >
          WINNER!
        </div>
      )}
    </button>
  );
}

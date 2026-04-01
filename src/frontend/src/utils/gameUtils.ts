export const PHASE_DURATIONS = {
  betting: 50,
  reveal: 5,
  cooldown: 5,
};

export function getPhaseTimeRemaining(
  phase: string,
  phaseStartTimestampNs: bigint,
): number {
  const phaseStartMs = Number(phaseStartTimestampNs) / 1_000_000;
  const elapsed = (Date.now() - phaseStartMs) / 1000; // seconds
  const duration = PHASE_DURATIONS[phase as keyof typeof PHASE_DURATIONS] ?? 50;
  return Math.max(0, duration - elapsed);
}

export function getColorConfig(color: string) {
  switch (color.toLowerCase()) {
    case "red":
      return {
        label: "Red",
        bg: "bg-neon-red/10",
        border: "border-neon-red/50",
        text: "text-neon-red",
        flashClass: "animate-flash-red",
        hex: "#FF4A4A",
        emoji: "🔴",
      };
    case "green":
      return {
        label: "Green",
        bg: "bg-neon-green/10",
        border: "border-neon-green/50",
        text: "text-neon-green",
        flashClass: "animate-flash-green",
        hex: "#33F5A4",
        emoji: "🟢",
      };
    case "violet":
      return {
        label: "Violet",
        bg: "bg-neon-violet/10",
        border: "border-neon-violet/50",
        text: "text-neon-violet",
        flashClass: "animate-flash-violet",
        hex: "#B455FF",
        emoji: "🟣",
      };
    default:
      return {
        label: color,
        bg: "bg-muted/10",
        border: "border-muted/50",
        text: "text-muted-foreground",
        flashClass: "",
        hex: "#9AA6B2",
        emoji: "⚪",
      };
  }
}

export function formatCoins(n: bigint | number): string {
  const val = typeof n === "bigint" ? Number(n) : n;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toString();
}

export function canClaimBonus(lastBonusTimeNs: bigint): boolean {
  const lastMs = Number(lastBonusTimeNs) / 1_000_000;
  return Date.now() - lastMs > 24 * 60 * 60 * 1000;
}

import { useEffect, useRef } from "react";
import { PHASE_DURATIONS } from "../utils/gameUtils";
import { playCountdownBeep } from "../utils/sound";

interface CountdownRingProps {
  timeRemaining: number;
  phase: string;
  totalDuration?: number;
}

export function CountdownRing({
  timeRemaining,
  phase,
  totalDuration,
}: CountdownRingProps) {
  const duration = totalDuration ?? 60;
  const progress = Math.max(0, Math.min(1, timeRemaining / duration));
  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const prevTimeRef = useRef(timeRemaining);

  useEffect(() => {
    if (timeRemaining <= 10 && timeRemaining > 0) {
      const prev = Math.ceil(prevTimeRef.current);
      const curr = Math.ceil(timeRemaining);
      if (prev !== curr) {
        playCountdownBeep();
      }
    }
    prevTimeRef.current = timeRemaining;
  }, [timeRemaining]);

  const getPhaseLabel = () => {
    if (timeRemaining > 10) return "BETTING OPEN";
    if (timeRemaining > 0) return "BETTING CLOSED";
    return "NEXT ROUND";
  };

  const getPhaseColor = () => {
    if (phase === "reveal") return "#B455FF";
    if (phase === "cooldown") return "#4AA8FF";
    return "#33F5A4";
  };

  const getArcColor2 = () => {
    if (phase === "reveal") return "#E06BFF";
    if (phase === "cooldown") return "#4AA8FF";
    return "#B455FF";
  };

  const isUrgent = timeRemaining <= 10;

  return (
    <div
      className={`relative flex items-center justify-center ${
        isUrgent ? "animate-pulse-ring" : ""
      }`}
    >
      <svg
        width={size}
        height={size}
        role="img"
        aria-label={`${getPhaseLabel()} countdown: ${Math.ceil(timeRemaining)} seconds`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.22 0.04 240 / 0.4)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getPhaseColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference / 2} ${circumference}`}
          strokeDashoffset={dashOffset}
          style={{
            filter: `drop-shadow(0 0 6px ${getPhaseColor()}99)`,
            transition: "stroke-dashoffset 0.5s ease",
          }}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getArcColor2()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference / 2} ${circumference}`}
          strokeDashoffset={dashOffset + circumference / 2}
          style={{
            filter: `drop-shadow(0 0 6px ${getArcColor2()}99)`,
            transition: "stroke-dashoffset 0.5s ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] font-semibold tracking-widest text-muted-foreground">
          {getPhaseLabel()}
        </span>
        <span
          className="text-5xl font-black text-foreground tabular-nums"
          style={{
            textShadow: `0 0 20px ${getPhaseColor()}66`,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.ceil(timeRemaining).toString().padStart(2, "0")}
        </span>
        <span className="text-[11px] text-muted-foreground mt-0.5">
          seconds
        </span>
      </div>
    </div>
  );
}

import { motion, useAnimation } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import { useSpinWheel } from "../hooks/useQueries";

const PRIZES = [9, 129, 19, 499, 29, 999];
const PRIZE_COLORS = [
  "oklch(0.85 0.2 168)", // green - 9
  "oklch(0.57 0.28 300)", // violet - 129 (ghost)
  "oklch(0.75 0.2 60)", // amber - 19
  "oklch(0.55 0.22 300)", // dark violet - 499 (ghost)
  "oklch(0.65 0.25 150)", // teal - 29
  "oklch(0.5 0.25 280)", // indigo - 999 (ghost)
];

const NUM_SEGMENTS = 6;
const SEGMENT_ANGLE = 360 / NUM_SEGMENTS;

const PRIZE_SEGMENTS = PRIZES.map((prize, index) => ({
  prize,
  index,
  color: PRIZE_COLORS[index],
  isGhost: ![9, 19, 29].includes(prize),
}));

interface SpinWheelProps {
  profile: UserProfile | null;
}

// The actual win prizes (index in PRIZES array: 0=9, 2=19, 4=29)
const WIN_PRIZE_INDICES = [0, 2, 4]; // indices that correspond to 9, 19, 29

function canSpin(lastSpinTime: bigint): boolean {
  const lastMs = Number(lastSpinTime) / 1_000_000;
  return Date.now() - lastMs > 24 * 60 * 60 * 1000;
}

function timeUntilSpin(lastSpinTime: bigint): string {
  const lastMs = Number(lastSpinTime) / 1_000_000;
  const msLeft = Math.max(0, 24 * 60 * 60 * 1000 - (Date.now() - lastMs));
  const h = Math.floor(msLeft / (1000 * 60 * 60));
  const m = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m`;
}

export function SpinWheel({ profile }: SpinWheelProps) {
  const spinMutation = useSpinWheel();
  const controls = useAnimation();
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonAmount, setWonAmount] = useState<number | null>(null);
  const currentRotationRef = useRef(0);

  const lastSpinTime = profile?.lastSpinTime ?? 0n;
  const eligible = canSpin(lastSpinTime);
  const timeLeft = !eligible ? timeUntilSpin(lastSpinTime) : null;

  const handleSpin = async () => {
    if (isSpinning || !eligible) return;
    setIsSpinning(true);
    setWonAmount(null);

    // Determine a random target win prize index for animation (visual only)
    // Pick a random win slot index (0, 2, or 4 in PRIZES)
    const targetPrizeIndex = WIN_PRIZE_INDICES[Math.floor(Math.random() * 3)];
    // Calculate angle so pointer lands on targetPrizeIndex segment
    // Segments are laid out starting from top (0deg), going clockwise
    // Center of segment i is at: i * SEGMENT_ANGLE + SEGMENT_ANGLE/2
    const segmentCenter = targetPrizeIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    // We want the wheel to land with pointer (at top = 0deg) pointing at segmentCenter
    // So wheel needs to rotate: 360 - segmentCenter (to bring that segment to top)
    const targetAngle = 360 - segmentCenter;
    // Add 5 full rotations for drama
    const fullSpins = 5 * 360;
    const finalRotation =
      currentRotationRef.current +
      fullSpins +
      targetAngle -
      (currentRotationRef.current % 360);
    currentRotationRef.current = finalRotation;

    // Start the spin animation
    controls.start({
      rotate: finalRotation,
      transition: { duration: 4, ease: [0.2, 0, 0.1, 1] },
    });

    try {
      const won = await spinMutation.mutateAsync();
      const wonNum = Number(won);
      setTimeout(() => {
        setWonAmount(wonNum);
        setIsSpinning(false);
        toast.success(`🎰 You won ${wonNum} coins from the spin!`);
      }, 4200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTimeout(() => {
        setIsSpinning(false);
        toast.error(msg || "Spin failed");
      }, 4200);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 w-full">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: "oklch(0.75 0.2 60 / 0.2)",
            border: "1px solid oklch(0.75 0.2 60 / 0.5)",
          }}
        >
          <span className="text-base">🎰</span>
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">Lucky Spin</p>
          <p className="text-[10px] text-muted-foreground">
            Spin once daily for free coins
          </p>
        </div>
      </div>

      {/* Wheel */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: 220, height: 220 }}
      >
        {/* Pointer triangle at top */}
        <div
          className="absolute top-0 left-1/2 z-10"
          style={{
            transform: "translateX(-50%) translateY(-2px)",
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: "18px solid oklch(0.95 0.01 240)",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          }}
        />

        {/* Wheel SVG */}
        <motion.div
          animate={controls}
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            position: "relative",
            overflow: "hidden",
            border: "3px solid oklch(0.95 0.01 240 / 0.3)",
            boxShadow:
              "0 0 30px oklch(0.75 0.2 60 / 0.3), 0 0 60px oklch(0.75 0.2 60 / 0.15)",
          }}
        >
          <svg
            width="200"
            height="200"
            viewBox="0 0 200 200"
            style={{ transform: "rotate(-90deg)" }}
            role="img"
            aria-label="Spin wheel with prize segments"
          >
            <title>Spin wheel</title>
            {PRIZE_SEGMENTS.map(({ prize, index: segIdx, color, isGhost }) => {
              const startAngle = (segIdx * SEGMENT_ANGLE * Math.PI) / 180;
              const endAngle = ((segIdx + 1) * SEGMENT_ANGLE * Math.PI) / 180;
              const x1 = 100 + 100 * Math.cos(startAngle);
              const y1 = 100 + 100 * Math.sin(startAngle);
              const x2 = 100 + 100 * Math.cos(endAngle);
              const y2 = 100 + 100 * Math.sin(endAngle);
              const midAngle = startAngle + (SEGMENT_ANGLE * Math.PI) / 180 / 2;
              const textX = 100 + 62 * Math.cos(midAngle);
              const textY = 100 + 62 * Math.sin(midAngle);

              return (
                <g key={`seg-${prize}-${segIdx}`}>
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                    fill={color}
                    opacity={isGhost ? 0.4 : 0.85}
                    stroke="oklch(0.09 0.018 240)"
                    strokeWidth="1"
                  />
                  <text
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={prize >= 100 ? "9" : "11"}
                    fontWeight="bold"
                    transform={`rotate(${segIdx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 + 90}, ${textX}, ${textY})`}
                    opacity={isGhost ? 0.5 : 1}
                  >
                    {prize}
                  </text>
                </g>
              );
            })}
            {/* Center circle */}
            <circle
              cx="100"
              cy="100"
              r="18"
              fill="oklch(0.09 0.018 240)"
              stroke="oklch(0.95 0.01 240 / 0.3)"
              strokeWidth="2"
            />
            <text
              x="100"
              y="100"
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="10"
              fontWeight="bold"
            >
              SPIN
            </text>
          </svg>
        </motion.div>
      </div>

      {/* Win display */}
      {wonAmount !== null && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center px-5 py-2 rounded-full text-sm font-black"
          style={{
            background: "oklch(0.85 0.2 168 / 0.15)",
            border: "1.5px solid oklch(0.85 0.2 168 / 0.6)",
            color: "oklch(0.85 0.2 168)",
            boxShadow: "0 0 20px oklch(0.85 0.2 168 / 0.3)",
          }}
        >
          🎉 +{wonAmount} coins added!
        </motion.div>
      )}

      {/* Spin button / cooldown */}
      {eligible ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSpin}
          disabled={isSpinning}
          className="w-full py-3 rounded-xl font-black text-sm transition-opacity"
          style={{
            background: isSpinning
              ? "oklch(0.3 0.02 240)"
              : "linear-gradient(135deg, oklch(0.75 0.2 60), oklch(0.65 0.22 60))",
            color: "white",
            border: "none",
            opacity: isSpinning ? 0.7 : 1,
            boxShadow: isSpinning
              ? undefined
              : "0 0 20px oklch(0.75 0.2 60 / 0.4)",
          }}
        >
          {isSpinning ? "Spinning..." : "🎰 Spin Now (Free)"}
        </motion.button>
      ) : (
        <div
          className="w-full py-3 rounded-xl text-center"
          style={{
            background: "oklch(0.12 0.02 240 / 0.8)",
            border: "1px solid oklch(0.25 0.04 240 / 0.5)",
          }}
        >
          <p className="text-xs font-semibold text-foreground">
            Already spun today
          </p>
          <p className="text-[11px] text-muted-foreground">
            Next spin in{" "}
            <span className="font-bold text-neon-green">{timeLeft}</span>
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center px-2">
        Prizes: 9 · 19 · 29 · 129 · 499 · 999 coins. One free spin daily.
      </p>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePlaceBet } from "../hooks/useQueries";
import { getColorConfig } from "../utils/gameUtils";
import { playBetPlaced } from "../utils/sound";

const AMOUNT_CHIPS = [10, 50, 100, 500, 1000];

interface BetPanelProps {
  phase: string;
  selectedColor: string | null;
  userCoins: bigint;
  alreadyBet: boolean;
  timeRemaining: number;
}

export function BetPanel({
  phase,
  selectedColor,
  userCoins,
  alreadyBet,
  timeRemaining,
}: BetPanelProps) {
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [betMode, setBetMode] = useState<"color" | "size">("color");
  const [selectedSize, setSelectedSize] = useState<"big" | "small" | null>(
    null,
  );
  const placeBet = usePlaceBet();
  const isBetting = phase === "betting" && timeRemaining > 10;
  const bettingClosed = phase === "betting" && timeRemaining <= 10;

  // In color mode use selectedColor; in size mode use selectedSize mapped to color
  const effectiveColor =
    betMode === "color"
      ? selectedColor
      : selectedSize === "big"
        ? "green"
        : selectedSize === "small"
          ? "red"
          : null;
  const canBet = isBetting && !!effectiveColor && !alreadyBet;
  const cfg =
    betMode === "color" && selectedColor ? getColorConfig(selectedColor) : null;

  const effectiveAmount = customAmount
    ? Number.parseInt(customAmount, 10)
    : amount;

  const handlePlaceBet = async () => {
    if (!canBet || !effectiveColor) return;
    const betAmount = BigInt(effectiveAmount);
    if (betAmount <= 0n || betAmount > userCoins) {
      toast.error(
        betAmount <= 0n ? "Invalid bet amount" : "Insufficient coins",
      );
      return;
    }
    try {
      await placeBet.mutateAsync({ color: effectiveColor, amount: betAmount });
      playBetPlaced();
      const label =
        betMode === "size"
          ? selectedSize === "big"
            ? "BIG"
            : "SMALL"
          : effectiveColor.toUpperCase();
      toast.success(`Bet placed: ${effectiveAmount} coins on ${label}!`);
      setCustomAmount("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to place bet");
    }
  };

  const betLabel =
    betMode === "size"
      ? selectedSize
        ? `BET ${effectiveAmount} COINS ON ${selectedSize.toUpperCase()}`
        : "← Select BIG or SMALL"
      : selectedColor
        ? `BET ${effectiveAmount} COINS ON ${selectedColor.toUpperCase()}`
        : "← Select a color first";

  return (
    <div
      className="card-surface rounded-xl p-4 space-y-4"
      data-ocid="bet.panel"
    >
      {/* Mode toggle */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: "oklch(0.14 0.02 240 / 0.8)" }}
      >
        {(["color", "size"] as const).map((mode) => (
          <button
            type="button"
            key={mode}
            onClick={() => setBetMode(mode)}
            className="flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            style={{
              background:
                betMode === mode ? "oklch(0.85 0.2 168 / 0.18)" : "transparent",
              border:
                betMode === mode
                  ? "1px solid oklch(0.85 0.2 168 / 0.5)"
                  : "1px solid transparent",
              color:
                betMode === mode
                  ? "oklch(0.85 0.2 168)"
                  : "oklch(0.55 0.02 240)",
            }}
            data-ocid={`bet.mode_${mode}.toggle`}
          >
            {mode === "color" ? "🎨 Color" : "📐 Size"}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Place Bet
        </h3>
        {betMode === "color" && selectedColor && cfg && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}
          >
            {cfg.label} selected
          </span>
        )}
        {betMode === "size" && selectedSize && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full border"
            style={{
              background:
                selectedSize === "big"
                  ? "oklch(0.72 0.18 220 / 0.15)"
                  : "oklch(0.72 0.22 50 / 0.15)",
              borderColor:
                selectedSize === "big"
                  ? "oklch(0.72 0.18 220 / 0.5)"
                  : "oklch(0.72 0.22 50 / 0.5)",
              color:
                selectedSize === "big"
                  ? "oklch(0.72 0.18 220)"
                  : "oklch(0.72 0.22 50)",
            }}
          >
            {selectedSize === "big" ? "BIG" : "SMALL"} selected
          </span>
        )}
      </div>

      {/* Size selector buttons */}
      {betMode === "size" && isBetting && !alreadyBet && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedSize("big")}
            data-ocid="bet.big.button"
            className="py-4 rounded-xl font-black text-base uppercase tracking-wider transition-all"
            style={{
              background:
                selectedSize === "big"
                  ? "oklch(0.72 0.18 220 / 0.25)"
                  : "oklch(0.72 0.18 220 / 0.08)",
              border:
                selectedSize === "big"
                  ? "2px solid oklch(0.72 0.18 220 / 0.8)"
                  : "1px solid oklch(0.72 0.18 220 / 0.3)",
              color: "oklch(0.72 0.18 220)",
              boxShadow:
                selectedSize === "big"
                  ? "0 0 20px oklch(0.72 0.18 220 / 0.3)"
                  : "none",
            }}
          >
            <div className="text-2xl mb-0.5">⬆️</div>
            BIG
            <div className="text-[10px] font-normal opacity-70 mt-0.5">
              2× payout
            </div>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSize("small")}
            data-ocid="bet.small.button"
            className="py-4 rounded-xl font-black text-base uppercase tracking-wider transition-all"
            style={{
              background:
                selectedSize === "small"
                  ? "oklch(0.72 0.22 50 / 0.25)"
                  : "oklch(0.72 0.22 50 / 0.08)",
              border:
                selectedSize === "small"
                  ? "2px solid oklch(0.72 0.22 50 / 0.8)"
                  : "1px solid oklch(0.72 0.22 50 / 0.3)",
              color: "oklch(0.72 0.22 50)",
              boxShadow:
                selectedSize === "small"
                  ? "0 0 20px oklch(0.72 0.22 50 / 0.3)"
                  : "none",
            }}
          >
            <div className="text-2xl mb-0.5">⬇️</div>
            SMALL
            <div className="text-[10px] font-normal opacity-70 mt-0.5">
              2× payout
            </div>
          </button>
        </div>
      )}

      {bettingClosed && (
        <div
          className="flex items-center justify-center py-3 rounded-lg border"
          style={{
            background: "oklch(0.60 0.22 25 / 0.1)",
            border: "1px solid oklch(0.60 0.22 25 / 0.4)",
          }}
          data-ocid="bet.closed.error_state"
        >
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "oklch(0.70 0.18 25)" }}
          >
            🔒 Betting closed — last 10 seconds
          </span>
        </div>
      )}
      {!isBetting && !bettingClosed && (
        <div
          className="flex items-center justify-center py-3 rounded-lg bg-muted/30 border border-border/40"
          data-ocid="bet.closed.error_state"
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {phase === "reveal"
              ? "🎲 Revealing result..."
              : "⏳ Round starting soon..."}
          </span>
        </div>
      )}

      {alreadyBet && isBetting && (
        <div
          className="flex items-center justify-center py-2 rounded-lg"
          style={{
            background: "oklch(0.85 0.2 168 / 0.1)",
            border: "1px solid oklch(0.85 0.2 168 / 0.3)",
          }}
          data-ocid="bet.placed.success_state"
        >
          <span className="text-xs font-semibold text-neon-green">
            ✓ Bet placed this round
          </span>
        </div>
      )}

      {isBetting && !alreadyBet && (
        <>
          <div className="flex flex-wrap gap-2">
            {AMOUNT_CHIPS.map((chip) => (
              <button
                type="button"
                key={chip}
                data-ocid={`bet.amount_${chip}.button`}
                onClick={() => {
                  setAmount(chip);
                  setCustomAmount("");
                }}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                  amount === chip && !customAmount
                    ? "border-neon-green/70 text-neon-green bg-neon-green/10"
                    : "border-border/40 text-muted-foreground hover:border-border",
                ].join(" ")}
              >
                {chip}
              </button>
            ))}
            <button
              type="button"
              data-ocid="bet.max.button"
              onClick={() => {
                setAmount(Number(userCoins));
                setCustomAmount(String(Number(userCoins)));
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border/40 text-muted-foreground hover:border-border transition-all"
            >
              MAX
            </button>
          </div>

          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Custom amount..."
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              data-ocid="bet.amount.input"
              className="text-sm bg-muted/30 border-border/40 text-foreground"
            />
          </div>

          <Button
            onClick={handlePlaceBet}
            disabled={!canBet || placeBet.isPending}
            data-ocid="bet.submit.button"
            className="w-full font-bold text-sm py-5 btn-gradient text-background hover:opacity-90 transition-all disabled:opacity-40"
          >
            {placeBet.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing Bet...
              </>
            ) : (
              betLabel
            )}
          </Button>
        </>
      )}
    </div>
  );
}

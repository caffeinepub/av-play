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
}

export function BetPanel({
  phase,
  selectedColor,
  userCoins,
  alreadyBet,
}: BetPanelProps) {
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState("");
  const placeBet = usePlaceBet();
  const isBetting = phase === "betting";
  const canBet = isBetting && !!selectedColor && !alreadyBet;
  const cfg = selectedColor ? getColorConfig(selectedColor) : null;

  const effectiveAmount = customAmount
    ? Number.parseInt(customAmount, 10)
    : amount;

  const handlePlaceBet = async () => {
    if (!canBet || !selectedColor) return;
    const betAmount = BigInt(effectiveAmount);
    if (betAmount <= 0n || betAmount > userCoins) {
      toast.error(
        betAmount <= 0n ? "Invalid bet amount" : "Insufficient coins",
      );
      return;
    }
    try {
      await placeBet.mutateAsync({ color: selectedColor, amount: betAmount });
      playBetPlaced();
      toast.success(
        `Bet placed: ${effectiveAmount} coins on ${selectedColor}!`,
      );
      setCustomAmount("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to place bet");
    }
  };

  return (
    <div
      className="card-surface rounded-xl p-4 space-y-4"
      data-ocid="bet.panel"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Place Bet
        </h3>
        {selectedColor && cfg && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}
          >
            {cfg.label} selected
          </span>
        )}
      </div>

      {!isBetting && (
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
            ) : !selectedColor ? (
              "← Select a color first"
            ) : (
              `BET ${effectiveAmount} COINS ON ${selectedColor.toUpperCase()}`
            )}
          </Button>
        </>
      )}
    </div>
  );
}

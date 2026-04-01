import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CheckCircle2, Circle, Gift, Zap } from "lucide-react";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import { useClaimBonus } from "../hooks/useQueries";
import { canClaimBonus } from "../utils/gameUtils";

interface ActivitySheetProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
}

// 10 coins per day for 7 days
const DAY_LABELS = [
  "Day 1",
  "Day 2",
  "Day 3",
  "Day 4",
  "Day 5",
  "Day 6",
  "Day 7",
];

export function ActivitySheet({ open, onClose, profile }: ActivitySheetProps) {
  const claimBonus = useClaimBonus();

  const streak = Number(profile?.dailyStreak ?? 0n);
  const lastBonusTime = profile?.lastBonusTime ?? 0n;
  const canClaim = profile ? canClaimBonus(lastBonusTime) : false;
  const currentDay = Math.min(streak, 7);
  // Next claimable day index (0-based)
  const nextDayIndex = streak % 7;

  const handleClaim = async () => {
    try {
      await claimBonus.mutateAsync();
      toast.success(
        `\uD83C\uDF89 Day ${nextDayIndex + 1} attendance claimed! +10 coins`,
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to claim");
    }
  };

  // Time until next claim
  const msUntilNext = profile
    ? Math.max(
        0,
        24 * 60 * 60 * 1000 - (Date.now() - Number(lastBonusTime) / 1_000_000),
      )
    : 0;
  const hoursLeft = Math.floor(msUntilNext / (1000 * 60 * 60));
  const minsLeft = Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-border/30 p-0"
        style={{
          background: "oklch(0.09 0.018 240 / 0.98)",
          backdropFilter: "blur(20px)",
          maxHeight: "80vh",
        }}
      >
        <SheetHeader className="px-4 pt-4 pb-3">
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 rounded-full bg-border/50" />
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.57 0.28 300 / 0.2)",
                border: "1px solid oklch(0.57 0.28 300 / 0.5)",
              }}
            >
              <Zap
                className="w-5 h-5"
                style={{ color: "oklch(0.68 0.25 300)" }}
              />
            </div>
            <div>
              <SheetTitle className="text-sm font-bold text-foreground text-left">
                Daily Attendance
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground">
                Check in every day and earn 10 coins
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-5">
          {/* Streak badge */}
          <div
            className="flex items-center justify-between rounded-xl p-3"
            style={{
              background: "oklch(0.57 0.28 300 / 0.08)",
              border: "1px solid oklch(0.57 0.28 300 / 0.3)",
            }}
          >
            <div>
              <p className="text-xs text-muted-foreground">Current Streak</p>
              <p
                className="text-2xl font-black"
                style={{ color: "oklch(0.68 0.25 300)" }}
              >
                {currentDay}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / 7 days
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total earned</p>
              <p className="text-lg font-black text-neon-green">
                {currentDay * 10}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  coins
                </span>
              </p>
            </div>
          </div>

          {/* 7-day grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((label, i) => {
              const claimed =
                i < nextDayIndex ||
                (streak >= 7 && streak % 7 === 0 && streak > 0);
              const isToday = i === nextDayIndex && canClaim;
              const isFuture = i > nextDayIndex;

              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full aspect-square rounded-xl flex flex-col items-center justify-center relative"
                    style={{
                      background: claimed
                        ? "oklch(0.85 0.2 168 / 0.15)"
                        : isToday
                          ? "oklch(0.57 0.28 300 / 0.2)"
                          : "oklch(0.12 0.02 240 / 0.8)",
                      border: claimed
                        ? "1.5px solid oklch(0.85 0.2 168 / 0.5)"
                        : isToday
                          ? "1.5px solid oklch(0.57 0.28 300 / 0.7)"
                          : "1.5px solid oklch(0.25 0.04 240 / 0.5)",
                      boxShadow: isToday
                        ? "0 0 10px oklch(0.57 0.28 300 / 0.3)"
                        : undefined,
                    }}
                  >
                    {claimed ? (
                      <CheckCircle2 className="w-4 h-4 text-neon-green" />
                    ) : isFuture ? (
                      <Circle
                        className="w-4 h-4"
                        style={{ color: "oklch(0.4 0.02 240)" }}
                      />
                    ) : (
                      <Gift
                        className="w-4 h-4"
                        style={{ color: "oklch(0.68 0.25 300)" }}
                      />
                    )}
                    <span
                      className="text-[9px] font-bold mt-0.5"
                      style={{
                        color: claimed
                          ? "oklch(0.85 0.2 168)"
                          : isToday
                            ? "oklch(0.68 0.25 300)"
                            : "oklch(0.4 0.02 240)",
                      }}
                    >
                      +10
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-semibold"
                    style={{
                      color: claimed
                        ? "oklch(0.85 0.2 168)"
                        : isToday
                          ? "oklch(0.68 0.25 300)"
                          : "oklch(0.4 0.02 240)",
                    }}
                  >
                    D{i + 1}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Claim button */}
          {canClaim ? (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                duration: 1,
              }}
            >
              <Button
                onClick={handleClaim}
                disabled={claimBonus.isPending}
                className="w-full font-black text-sm py-6"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.57 0.28 300), oklch(0.45 0.25 300))",
                  color: "white",
                  boxShadow: "0 0 20px oklch(0.57 0.28 300 / 0.4)",
                }}
              >
                {claimBonus.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    Claim Day {nextDayIndex + 1} Reward (+10 coins)
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: "oklch(0.12 0.02 240 / 0.8)",
                border: "1px solid oklch(0.25 0.04 240 / 0.5)",
              }}
            >
              <p className="text-xs font-semibold text-foreground mb-1">
                Come back tomorrow!
              </p>
              {msUntilNext > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Next reward in{" "}
                  <span className="font-bold text-neon-green">
                    {hoursLeft}h {minsLeft}m
                  </span>
                </p>
              )}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground text-center">
            Complete all 7 days for the full reward cycle. Missing a day resets
            your streak.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

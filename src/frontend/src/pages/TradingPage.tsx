import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Home, LogOut, Settings, User, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActivitySheet } from "../components/ActivitySheet";
import { BetPanel } from "../components/BetPanel";
import { ColorCard } from "../components/ColorCard";
import { CountdownRing } from "../components/CountdownRing";
import { LiveTicker } from "../components/LiveTicker";
import { ProfileSheet } from "../components/ProfileSheet";
import { type HistoryEntry, RoundHistory } from "../components/RoundHistory";
import { WalletPanel } from "../components/WalletPanel";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGameState, useUserProfile } from "../hooks/useQueries";
import {
  getPhaseFromTimeRemaining,
  getResultForRound,
  getRoundNumber,
  getUnifiedTimeRemaining,
} from "../utils/gameUtils";
import { playLoseSound, playWinChime } from "../utils/sound";

export function TradingPage() {
  const { clear, identity } = useInternetIdentity();
  const { actor } = useActor();
  const gameState = useGameState();
  const userProfile = useUserProfile();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getUnifiedTimeRemaining(),
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [roundHistory, setRoundHistory] = useState<HistoryEntry[]>([]);
  const prevRoundIdRef = useRef<number | null>(null);

  // Re-register access control after actor is ready
  useEffect(() => {
    if (!actor) return;
    actor
      ._initializeAccessControlWithSecret(
        import.meta.env.VITE_CAFFEINE_ADMIN_TOKEN ?? "",
      )
      .catch(() => {});
  }, [actor]);

  // Wall-clock based countdown + round-change detection in one interval
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getUnifiedTimeRemaining());

      const currentRound = getRoundNumber();
      if (
        prevRoundIdRef.current !== null &&
        prevRoundIdRef.current !== currentRound
      ) {
        const prevRound = prevRoundIdRef.current;
        const result = getResultForRound(prevRound);
        setRoundHistory((prev) => {
          if (prev.find((e) => e.roundId === prevRound)) return prev;
          return [
            {
              roundId: prevRound,
              color: result.color,
              size: result.size,
              timestamp: Date.now(),
            },
            ...prev,
          ].slice(0, 30);
        });
        setSelectedColor(null);
      }
      prevRoundIdRef.current = currentRound;
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const gs = gameState.data;
  const profile = userProfile.data ?? null;

  const phase = getPhaseFromTimeRemaining(timeRemaining);

  const multipliers = gs?.multipliers ?? { red: 2, green: 2, violet: 4.5 };
  const backendRoundHistory = gs?.roundHistory ?? [];
  const currentRoundId = getRoundNumber();
  const currentResult = getResultForRound(currentRoundId);

  // Win/loss toast based on backend data
  const prevBigintRef = useRef<bigint | null>(null);
  useEffect(() => {
    if (!gs || !profile) return;
    const { currentRoundId: rid, roundHistory: rh } = gs;
    if (prevBigintRef.current !== null && prevBigintRef.current !== rid) {
      const prevRound = rh.find((r) => r.roundId === prevBigintRef.current);
      if (prevRound?.result) {
        const userBet = prevRound.bets.find(
          (b) => b[0].toString() === identity?.getPrincipal().toString(),
        );
        if (userBet) {
          if (userBet[1].betColor === prevRound.result) {
            playWinChime();
            toast.success(
              `\uD83C\uDF89 You WON! Bet on ${prevRound.result.toUpperCase()}`,
            );
          } else {
            playLoseSound();
            toast.error(
              `\uD83D\uDE1E You lost. Result was ${prevRound.result.toUpperCase()}`,
            );
          }
        }
      }
    }
    prevBigintRef.current = rid;
  }, [gs, profile, identity]);

  const alreadyBet =
    profile?.betHistory?.some(() => {
      const currentRound = backendRoundHistory.find(
        (r) => r.roundId === gs?.currentRoundId,
      );
      if (!currentRound) return false;
      return currentRound.bets.some(
        (bet) => bet[0].toString() === identity?.getPrincipal().toString(),
      );
    }) ?? false;

  const currentRound = backendRoundHistory.find(
    (r) => r.roundId === gs?.currentRoundId,
  );
  const roundBets = {
    red: currentRound?.totalRedBets ?? 0n,
    green: currentRound?.totalGreenBets ?? 0n,
    violet: currentRound?.totalVioletBets ?? 0n,
  };

  const principal = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = principal ? `${principal.slice(0, 8)}...` : "Guest";

  const colorHex = (c: "red" | "green" | "violet") =>
    c === "red" ? "#FF4A4A" : c === "green" ? "#33F5A4" : "#B455FF";
  const colorEmoji = (c: "red" | "green" | "violet") =>
    c === "red" ? "🔴" : c === "green" ? "🟢" : "🟣";
  const sizeColor = (s: "BIG" | "SMALL") =>
    s === "BIG" ? "#4AA8FF" : "#FF8C42";
  const sizeEmoji = (s: "BIG" | "SMALL") => (s === "BIG" ? "⬆️" : "⬇️");

  return (
    <div className="min-h-screen flex flex-col pb-24">
      <header
        className="sticky top-0 z-40 border-b border-border/30"
        style={{
          background: "oklch(0.09 0.018 240 / 0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-black gradient-logo tracking-tight"
          >
            AV PLAY
          </Link>

          <nav
            className="hidden md:flex items-center gap-4"
            data-ocid="nav.section"
          >
            <span className="text-xs font-semibold text-neon-green">Trade</span>
            <span className="text-xs text-muted-foreground cursor-default">
              Markets
            </span>
            <span className="text-xs text-muted-foreground cursor-default">
              Dashboard
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/admin">
              <Button
                size="sm"
                variant="outline"
                data-ocid="nav.admin.link"
                className="text-xs border-neon-violet/40 text-neon-violet h-7"
              >
                <Settings className="w-3 h-3 mr-1" /> Admin
              </Button>
            </Link>
            <Badge
              variant="outline"
              className="text-xs border-border/50 text-muted-foreground hidden sm:flex"
            >
              {shortPrincipal}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={clear}
              data-ocid="nav.logout.button"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key="trading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-surface rounded-xl p-4 flex flex-col items-center gap-3">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Round
                    </div>
                    <div className="text-lg font-black text-foreground">
                      #{currentRoundId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">
                      Phase
                    </div>
                    <div
                      className={`text-sm font-bold capitalize ${
                        phase === "betting"
                          ? timeRemaining > 10
                            ? "text-neon-green"
                            : "text-yellow-400"
                          : phase === "reveal"
                            ? "text-neon-violet"
                            : "text-neon-blue"
                      }`}
                    >
                      {timeRemaining > 10
                        ? "Betting Open"
                        : phase === "reveal"
                          ? "Result"
                          : "Closed"}
                    </div>
                  </div>
                </div>

                <CountdownRing timeRemaining={timeRemaining} phase={phase} />

                <AnimatePresence>
                  {phase === "reveal" && (
                    <motion.div
                      key="result-reveal"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="text-center w-full"
                    >
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        Result
                      </div>
                      <div
                        className="text-3xl font-black uppercase mb-2"
                        style={{
                          color: colorHex(currentResult.color),
                          textShadow: `0 0 24px ${colorHex(currentResult.color)}99, 0 0 48px ${colorHex(currentResult.color)}44`,
                        }}
                      >
                        {colorEmoji(currentResult.color)} {currentResult.color}{" "}
                        wins!
                      </div>
                      <div className="flex justify-center">
                        <span
                          className="px-4 py-1.5 rounded-full text-sm font-bold"
                          style={{
                            background: `${sizeColor(currentResult.size)}22`,
                            color: sizeColor(currentResult.size),
                            border: `1.5px solid ${sizeColor(currentResult.size)}77`,
                            boxShadow: `0 0 12px ${sizeColor(currentResult.size)}44`,
                          }}
                        >
                          {sizeEmoji(currentResult.size)} {currentResult.size}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <WalletPanel profile={profile} />
            </div>

            <div
              className="grid grid-cols-3 gap-3"
              data-ocid="trade.colors.section"
            >
              {(["red", "green", "violet"] as const).map((color) => (
                <ColorCard
                  key={color}
                  color={color}
                  multiplier={multipliers[color]}
                  totalBets={roundBets[color]}
                  isSelected={selectedColor === color}
                  isWinner={phase === "reveal" && currentResult.color === color}
                  isReveal={phase === "reveal"}
                  disabled={
                    phase !== "betting" || alreadyBet || timeRemaining <= 10
                  }
                  onClick={() =>
                    phase === "betting" &&
                    !alreadyBet &&
                    timeRemaining > 10 &&
                    setSelectedColor(color)
                  }
                />
              ))}
            </div>

            <BetPanel
              phase={phase}
              selectedColor={selectedColor}
              userCoins={profile?.coins ?? 0n}
              alreadyBet={alreadyBet}
              timeRemaining={timeRemaining}
            />

            <RoundHistory history={roundHistory} />
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50">
        <LiveTicker />

        <nav
          className="flex items-center"
          style={{
            background: "oklch(0.09 0.018 240 / 0.97)",
            borderTop: "1px solid oklch(0.25 0.04 240 / 0.5)",
            backdropFilter: "blur(16px)",
            height: "64px",
          }}
        >
          <div className="flex-1 flex justify-start pl-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setActivityOpen(true)}
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors"
              data-ocid="bottom_nav.activity.button"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center relative"
                style={{
                  background: "oklch(0.57 0.28 300 / 0.12)",
                  border: "1.5px solid oklch(0.57 0.28 300 / 0.4)",
                }}
              >
                <Zap
                  className="w-5 h-5"
                  style={{ color: "oklch(0.68 0.25 300)" }}
                />
                {profile &&
                  (() => {
                    const lastMs = Number(profile.lastBonusTime) / 1_000_000;
                    const canClaim = Date.now() - lastMs > 24 * 60 * 60 * 1000;
                    return canClaim ? (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse"
                        style={{
                          background: "oklch(0.85 0.2 168)",
                          border: "2px solid oklch(0.09 0.018 240)",
                        }}
                      />
                    ) : null;
                  })()}
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide uppercase"
                style={{ color: "oklch(0.68 0.25 300)" }}
              >
                Activity
              </span>
            </motion.button>
          </div>

          <Link to="/">
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors"
              style={{ color: "oklch(0.85 0.2 168)" }}
              data-ocid="bottom_nav.home.button"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "oklch(0.85 0.2 168 / 0.15)",
                  border: "1.5px solid oklch(0.85 0.2 168 / 0.5)",
                  boxShadow: "0 0 12px oklch(0.85 0.2 168 / 0.3)",
                }}
              >
                <Home className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold tracking-wide uppercase">
                Home
              </span>
            </motion.button>
          </Link>

          <div className="flex-1 flex justify-end pr-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setProfileOpen(true)}
              className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl transition-colors"
              data-ocid="bottom_nav.profile.button"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "oklch(0.57 0.28 300 / 0.1)",
                  border: "1.5px solid oklch(0.57 0.28 300 / 0.35)",
                }}
              >
                <User
                  className="w-5 h-5"
                  style={{ color: "oklch(0.57 0.28 300)" }}
                />
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide uppercase"
                style={{ color: "oklch(0.57 0.28 300)" }}
              >
                Profile
              </span>
            </motion.button>
          </div>
        </nav>
      </div>

      <ProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        shortPrincipal={shortPrincipal}
      />
      <ActivitySheet
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        profile={profile}
      />
    </div>
  );
}

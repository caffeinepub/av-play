import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Home, LogOut, Settings, User, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ActivitySheet } from "../components/ActivitySheet";
import { BetPanel } from "../components/BetPanel";
import { ColorCard } from "../components/ColorCard";
import { Confetti } from "../components/Confetti";
import { CountdownRing } from "../components/CountdownRing";
import { LiveTicker } from "../components/LiveTicker";
import { ProfileSheet } from "../components/ProfileSheet";
import { type HistoryEntry, RoundHistory } from "../components/RoundHistory";
import { WalletPanel } from "../components/WalletPanel";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCallerApprovedDepositTotal,
  useGameState,
  useUserProfile,
} from "../hooks/useQueries";
import {
  getPhaseFromTimeRemaining,
  getResultForRound,
  getRoundNumber,
  getUnifiedTimeRemaining,
} from "../utils/gameUtils";
import { playLoseSound, playWinChime } from "../utils/sound";

type AccumulatedBet = {
  roundId: number;
  color: string;
  totalAmount: number;
  count: number;
};

type WinPopup = {
  amount: number;
  multiplier: number;
  color: string;
};

type LossPopup = {
  resultColor: string;
  resultSize: string;
};

export function TradingPage() {
  const { clear, identity } = useInternetIdentity();
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const gameState = useGameState();
  const userProfile = useUserProfile();
  const approvedDepositTotal = useCallerApprovedDepositTotal();
  const totalDeposit = approvedDepositTotal.data ?? 0;
  const depositStatus = totalDeposit >= 100 ? "approved" : "pending";
  console.log(totalDeposit, depositStatus);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getUnifiedTimeRemaining(),
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [roundHistory, setRoundHistory] = useState<HistoryEntry[]>([]);
  const [winPopup, setWinPopup] = useState<WinPopup | null>(null);
  const [lossPopup, setLossPopup] = useState<LossPopup | null>(null);
  const prevRoundIdRef = useRef<number | null>(null);

  // Accumulated bets per round (color + size tracked separately)
  const [colorBetThisRound, setColorBetThisRound] =
    useState<AccumulatedBet | null>(null);
  const [sizeBetThisRound, setSizeBetThisRound] =
    useState<AccumulatedBet | null>(null);
  const colorBetRef = useRef<AccumulatedBet | null>(null);
  const sizeBetRef = useRef<AccumulatedBet | null>(null);

  // Keep live multipliers in a ref so the interval closure always has fresh values
  const multipliersRef = useRef({ red: 2, green: 2, violet: 4.5 });

  const gs = gameState.data;
  const profile = userProfile.data ?? null;

  // Sync multipliersRef whenever game state updates
  useEffect(() => {
    if (gs?.multipliers) {
      multipliersRef.current = gs.multipliers;
    }
  }, [gs?.multipliers]);

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

        const m = multipliersRef.current;
        let wonColor = false;
        let wonSize = false;
        let colorWinAmount = 0;
        let sizeWinAmount = 0;
        let colorMultiplier = 2;
        let sizeMultiplier = 2;

        // Evaluate color bet
        const colorBet = colorBetRef.current;
        if (colorBet && colorBet.roundId === prevRound) {
          wonColor = colorBet.color === result.color;
          colorMultiplier =
            colorBet.color === "violet"
              ? m.violet
              : colorBet.color === "green"
                ? m.green
                : m.red;
          colorWinAmount = Math.round(colorBet.totalAmount * colorMultiplier);
          if (wonColor) {
            actor
              ?.depositCoins(BigInt(colorWinAmount))
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["userProfile"] });
              })
              .catch(() => {});
          }
        }

        // Evaluate size bet
        const sizeBet = sizeBetRef.current;
        if (sizeBet && sizeBet.roundId === prevRound) {
          const betSize = sizeBet.color === "green" ? "BIG" : "SMALL";
          wonSize = betSize === result.size;
          sizeMultiplier = 2;
          sizeWinAmount = Math.round(sizeBet.totalAmount * sizeMultiplier);
          if (wonSize) {
            actor
              ?.depositCoins(BigInt(sizeWinAmount))
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["userProfile"] });
              })
              .catch(() => {});
          }
        }

        // Show result popups
        const hadColorBet = colorBet && colorBet.roundId === prevRound;
        const hadSizeBet = sizeBet && sizeBet.roundId === prevRound;

        if (wonColor || wonSize) {
          const totalWin = colorWinAmount + sizeWinAmount;
          const mult = wonColor ? colorMultiplier : sizeMultiplier;
          const winColor = wonColor
            ? colorBet!.color
            : sizeBet!.color === "green"
              ? "green"
              : "red";
          playWinChime();
          toast.success(`🎉 You WON! +${totalWin} coins`);
          setWinPopup({ amount: totalWin, multiplier: mult, color: winColor });
          setTimeout(() => setWinPopup(null), 3000);
        } else if (hadColorBet || hadSizeBet) {
          // Lost
          playLoseSound();
          toast.error(
            `😞 You lost. Result was ${result.color.toUpperCase()} / ${result.size}`,
          );
          setLossPopup({
            resultColor: result.color,
            resultSize: result.size,
          });
          setTimeout(() => setLossPopup(null), 2500);
        }

        // Clear bets for next round
        colorBetRef.current = null;
        sizeBetRef.current = null;
        setColorBetThisRound(null);
        setSizeBetThisRound(null);
      }
      prevRoundIdRef.current = currentRound;
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, queryClient]);

  const phase = getPhaseFromTimeRemaining(timeRemaining);

  const multipliers = gs?.multipliers ?? { red: 2, green: 2, violet: 4.5 };
  const backendRoundHistory = gs?.roundHistory ?? [];
  const currentRoundId = getRoundNumber();
  const currentResult = getResultForRound(currentRoundId);

  // Color card disabled logic: disabled if locked to a different color and already bet once
  const lockedColor =
    colorBetThisRound?.roundId === currentRoundId
      ? colorBetThisRound.color
      : null;
  const lockedSize =
    sizeBetThisRound?.roundId === currentRoundId
      ? sizeBetThisRound.color === "green"
        ? "big"
        : "small"
      : null;
  const colorBetCount =
    colorBetThisRound?.roundId === currentRoundId ? colorBetThisRound.count : 0;
  const sizeBetCount =
    sizeBetThisRound?.roundId === currentRoundId ? sizeBetThisRound.count : 0;

  const alreadyBet = colorBetCount >= 2 && sizeBetCount >= 2;

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

  const winColorHex = (c: string) =>
    c === "red" ? "#FF4A4A" : c === "green" ? "#33F5A4" : "#B455FF";

  const handleBetPlaced = (
    color: string,
    amount: number,
    mode: "color" | "size",
  ) => {
    const round = getRoundNumber();
    if (mode === "color") {
      const current = colorBetRef.current;
      if (!current || current.roundId !== round) {
        const newBet = { roundId: round, color, totalAmount: amount, count: 1 };
        colorBetRef.current = newBet;
        setColorBetThisRound(newBet);
      } else if (current.count < 2) {
        const updated = {
          ...current,
          totalAmount: current.totalAmount + amount,
          count: current.count + 1,
        };
        colorBetRef.current = updated;
        setColorBetThisRound(updated);
      }
    } else {
      const current = sizeBetRef.current;
      if (!current || current.roundId !== round) {
        const newBet = { roundId: round, color, totalAmount: amount, count: 1 };
        sizeBetRef.current = newBet;
        setSizeBetThisRound(newBet);
      } else if (current.count < 2) {
        const updated = {
          ...current,
          totalAmount: current.totalAmount + amount,
          count: current.count + 1,
        };
        sizeBetRef.current = updated;
        setSizeBetThisRound(updated);
      }
    }
  };

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
                  totalDeposit={totalDeposit}
                  disabled={
                    totalDeposit < 100 ||
                    phase !== "betting" ||
                    timeRemaining <= 10 ||
                    colorBetCount >= 2 ||
                    (lockedColor !== null &&
                      color !== lockedColor &&
                      colorBetCount >= 1)
                  }
                  onClick={() => {
                    if (
                      totalDeposit >= 100 &&
                      phase === "betting" &&
                      timeRemaining > 10 &&
                      colorBetCount < 2 &&
                      !(
                        lockedColor !== null &&
                        color !== lockedColor &&
                        colorBetCount >= 1
                      )
                    ) {
                      setSelectedColor(color);
                    }
                  }}
                />
              ))}
            </div>

            <BetPanel
              phase={phase}
              selectedColor={selectedColor}
              userCoins={profile?.coins ?? 0n}
              alreadyBet={alreadyBet}
              timeRemaining={timeRemaining}
              colorBetCount={colorBetCount}
              sizeBetCount={sizeBetCount}
              lockedColor={lockedColor}
              lockedSize={lockedSize}
              totalDeposit={totalDeposit}
              onBetPlaced={handleBetPlaced}
            />

            <RoundHistory history={roundHistory} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Confetti */}
      <Confetti
        active={!!winPopup}
        accentColor={winPopup ? winColorHex(winPopup.color) : "#FFD700"}
      />

      {/* Win Popup Overlay */}
      <AnimatePresence>
        {winPopup && (
          <motion.div
            key="win-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 flex items-center justify-center"
            style={{
              zIndex: 200,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
            }}
            onClick={() => setWinPopup(null)}
            data-ocid="win.modal"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 22,
                delay: 0.05,
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col items-center gap-4 rounded-3xl px-10 py-10 mx-6"
              style={{
                background: "oklch(0.09 0.025 260)",
                border: `2px solid ${winColorHex(winPopup.color)}`,
                boxShadow: `0 0 40px ${winColorHex(winPopup.color)}66, 0 0 80px ${winColorHex(winPopup.color)}33, inset 0 0 30px ${winColorHex(winPopup.color)}11`,
                minWidth: 280,
                maxWidth: 360,
              }}
            >
              {/* Sparkle ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 6,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background: `conic-gradient(from 0deg, transparent 70%, ${winColorHex(winPopup.color)}55 85%, transparent 100%)`,
                }}
              />

              {/* Trophy emoji */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [-8, 8, -8, 0] }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="text-7xl select-none"
              >
                🏆
              </motion.div>

              {/* YOU WON text */}
              <div
                className="text-4xl font-black tracking-wider uppercase"
                style={{
                  color: winColorHex(winPopup.color),
                  textShadow: `0 0 20px ${winColorHex(winPopup.color)}cc, 0 0 40px ${winColorHex(winPopup.color)}66`,
                }}
              >
                YOU WON!
              </div>

              {/* Win amount */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white"
              >
                +{winPopup.amount}{" "}
                <span className="text-yellow-400">COINS</span>
              </motion.div>

              {/* Multiplier badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 18,
                  delay: 0.3,
                }}
                className="px-5 py-2 rounded-full text-base font-black"
                style={{
                  background: `${winColorHex(winPopup.color)}22`,
                  color: winColorHex(winPopup.color),
                  border: `1.5px solid ${winColorHex(winPopup.color)}88`,
                  boxShadow: `0 0 16px ${winColorHex(winPopup.color)}44`,
                }}
              >
                {winPopup.multiplier}x MULTIPLIER
              </motion.div>

              {/* Tap to dismiss */}
              <p className="text-xs text-muted-foreground mt-2">
                Tap anywhere to dismiss
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loss Popup Overlay */}
      <AnimatePresence>
        {lossPopup && (
          <motion.div
            key="loss-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center"
            style={{
              zIndex: 199,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setLossPopup(null)}
            data-ocid="loss.modal"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -10 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 24,
                delay: 0.04,
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col items-center gap-3 rounded-3xl px-10 py-8 mx-6"
              style={{
                background: "oklch(0.09 0.018 240)",
                border: "2px solid oklch(0.40 0.10 25 / 0.7)",
                boxShadow:
                  "0 0 30px oklch(0.40 0.12 25 / 0.35), 0 0 60px oklch(0.40 0.12 25 / 0.15)",
                minWidth: 260,
                maxWidth: 340,
              }}
            >
              {/* Sad emoji */}
              <motion.div
                animate={{ rotate: [-5, 5, -5, 0] }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="text-6xl select-none"
              >
                😔
              </motion.div>

              <div
                className="text-3xl font-black tracking-wider uppercase"
                style={{ color: "oklch(0.70 0.14 25)" }}
              >
                Better Luck!
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm text-muted-foreground">Result was</p>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="text-base font-black uppercase px-3 py-1 rounded-full"
                    style={{
                      background:
                        lossPopup.resultColor === "red"
                          ? "oklch(0.60 0.22 25 / 0.2)"
                          : lossPopup.resultColor === "green"
                            ? "oklch(0.85 0.2 168 / 0.15)"
                            : "oklch(0.57 0.28 300 / 0.2)",
                      color:
                        lossPopup.resultColor === "red"
                          ? "oklch(0.70 0.20 25)"
                          : lossPopup.resultColor === "green"
                            ? "oklch(0.85 0.2 168)"
                            : "oklch(0.68 0.25 300)",
                      border:
                        lossPopup.resultColor === "red"
                          ? "1px solid oklch(0.60 0.22 25 / 0.5)"
                          : lossPopup.resultColor === "green"
                            ? "1px solid oklch(0.85 0.2 168 / 0.4)"
                            : "1px solid oklch(0.57 0.28 300 / 0.5)",
                    }}
                  >
                    {lossPopup.resultColor === "red"
                      ? "🔴"
                      : lossPopup.resultColor === "green"
                        ? "🟢"
                        : "🟣"}{" "}
                    {lossPopup.resultColor}
                  </span>
                  <span
                    className="text-sm font-bold px-2 py-1 rounded-full"
                    style={{
                      background: "oklch(0.72 0.18 220 / 0.1)",
                      color: "oklch(0.72 0.18 220)",
                      border: "1px solid oklch(0.72 0.18 220 / 0.3)",
                    }}
                  >
                    {lossPopup.resultSize === "BIG" ? "⬆️" : "⬇️"}{" "}
                    {lossPopup.resultSize}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                Tap anywhere to dismiss
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

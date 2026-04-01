import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { LogOut, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BetPanel } from "../components/BetPanel";
import { ColorCard } from "../components/ColorCard";
import { CountdownRing } from "../components/CountdownRing";
import { RoundHistory } from "../components/RoundHistory";
import { WalletPanel } from "../components/WalletPanel";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGameState, useIsAdmin, useUserProfile } from "../hooks/useQueries";
import { getPhaseTimeRemaining } from "../utils/gameUtils";
import { playLoseSound, playWinChime } from "../utils/sound";

export function TradingPage() {
  const { clear, identity } = useInternetIdentity();
  const { actor } = useActor();
  const gameState = useGameState();
  const userProfile = useUserProfile();
  const isAdmin = useIsAdmin();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(45);
  const prevRoundIdRef = useRef<bigint | null>(null);
  const registeredRef = useRef(false);

  // Register the caller with the access control system on first mount.
  // The first caller whose token matches becomes admin; everyone else becomes a regular user.
  useEffect(() => {
    if (!actor || registeredRef.current) return;
    registeredRef.current = true;
    actor
      ._initializeAccessControlWithSecret(
        import.meta.env.VITE_CAFFEINE_ADMIN_TOKEN ?? "",
      )
      .catch(() => {
        // Silently ignore — user may already be registered.
      });
  }, [actor]);

  const gs = gameState.data;
  const profile = userProfile.data ?? null;
  const phase = gs?.phase ?? "betting";
  const multipliers = gs?.multipliers ?? { red: 2, green: 2, violet: 4.5 };
  const roundHistory = gs?.roundHistory ?? [];
  const currentRoundId = gs?.currentRoundId ?? 0n;

  useEffect(() => {
    if (!gs) return;
    const interval = setInterval(() => {
      setTimeRemaining(getPhaseTimeRemaining(gs.phase, gs.phaseStartTimestamp));
    }, 200);
    return () => clearInterval(interval);
  }, [gs]);

  useEffect(() => {
    if (!gs || !profile) return;
    const { currentRoundId: rid, roundHistory: rh } = gs;

    if (prevRoundIdRef.current !== null && prevRoundIdRef.current !== rid) {
      const prevRound = rh.find((r) => r.roundId === prevRoundIdRef.current);
      if (prevRound?.result) {
        const userBet = prevRound.bets.find(
          (b) => b[0].toString() === identity?.getPrincipal().toString(),
        );
        if (userBet) {
          if (userBet[1].betColor === prevRound.result) {
            playWinChime();
            toast.success(
              `🎉 You WON! Bet on ${prevRound.result.toUpperCase()}`,
            );
          } else {
            playLoseSound();
            toast.error(
              `😞 You lost. Result was ${prevRound.result.toUpperCase()}`,
            );
          }
        }
      }
      setSelectedColor(null);
    }

    prevRoundIdRef.current = rid;
  }, [gs, profile, identity]);

  const alreadyBet =
    profile?.betHistory?.some(() => {
      const currentRound = roundHistory.find(
        (r) => r.roundId === currentRoundId,
      );
      if (!currentRound) return false;
      return currentRound.bets.some(
        (bet) => bet[0].toString() === identity?.getPrincipal().toString(),
      );
    }) ?? false;

  const currentRound = roundHistory.find((r) => r.roundId === currentRoundId);
  const roundBets = {
    red: currentRound?.totalRedBets ?? 0n,
    green: currentRound?.totalGreenBets ?? 0n,
    violet: currentRound?.totalVioletBets ?? 0n,
  };

  const revealResult =
    phase === "reveal"
      ? roundHistory.find((r) => r.roundId === currentRoundId)?.result
      : undefined;

  const principal = identity?.getPrincipal().toString() ?? "";
  const shortPrincipal = principal ? `${principal.slice(0, 8)}...` : "Guest";

  return (
    <div className="min-h-screen flex flex-col">
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
            {isAdmin.data && (
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
            )}
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
        {gameState.isLoading ? (
          <div className="space-y-4" data-ocid="trading.loading_state">
            <Skeleton className="h-64 w-full rounded-xl bg-muted/30" />
            <Skeleton className="h-32 w-full rounded-xl bg-muted/30" />
          </div>
        ) : (
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
                        #{Number(currentRoundId)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">
                        Phase
                      </div>
                      <div
                        className={`text-sm font-bold capitalize ${
                          phase === "betting"
                            ? "text-neon-green"
                            : phase === "reveal"
                              ? "text-neon-violet"
                              : "text-neon-blue"
                        }`}
                      >
                        {phase}
                      </div>
                    </div>
                  </div>

                  <CountdownRing timeRemaining={timeRemaining} phase={phase} />

                  {phase === "reveal" && revealResult && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="animate-reveal-glow text-center"
                    >
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Result
                      </div>
                      <div
                        className="text-2xl font-black uppercase"
                        style={{
                          color:
                            revealResult === "red"
                              ? "#FF4A4A"
                              : revealResult === "green"
                                ? "#33F5A4"
                                : "#B455FF",
                          textShadow: `0 0 20px ${
                            revealResult === "red"
                              ? "#FF4A4A"
                              : revealResult === "green"
                                ? "#33F5A4"
                                : "#B455FF"
                          }99`,
                        }}
                      >
                        {revealResult} wins!
                      </div>
                    </motion.div>
                  )}
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
                    isWinner={revealResult === color}
                    isReveal={phase === "reveal"}
                    disabled={phase !== "betting" || alreadyBet}
                    onClick={() =>
                      phase === "betting" &&
                      !alreadyBet &&
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
              />

              <RoundHistory rounds={roundHistory} />
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <footer className="border-t border-border/20 py-4 px-4 text-center">
        <p className="text-[11px] text-muted-foreground/50">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="hover:text-muted-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

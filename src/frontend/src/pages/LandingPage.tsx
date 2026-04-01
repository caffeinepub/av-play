import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Trophy, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const FEATURES = [
  { icon: Zap, label: "Real-time rounds", color: "text-neon-green" },
  { icon: TrendingUp, label: "4.5x multipliers", color: "text-neon-violet" },
  { icon: Shield, label: "Secure & fair", color: "text-neon-blue" },
  { icon: Trophy, label: "Daily rewards", color: "text-neon-red" },
];

export function LandingPage() {
  const { login, isLoggingIn } = useInternetIdentity();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none"
        style={{ background: "oklch(0.85 0.2 168 / 0.08)" }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
        style={{ background: "oklch(0.57 0.28 300 / 0.08)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md"
      >
        <div className="mb-6">
          <span className="text-5xl font-black gradient-logo tracking-tight">
            AV PLAY
          </span>
          <div className="mt-1 text-xs text-muted-foreground tracking-widest uppercase">
            Color Trading Platform
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-sm mb-8 leading-relaxed"
        >
          Trade colors in real-time. Predict the outcome. Win big.
          <br />
          The most exciting color trading experience.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          {FEATURES.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="card-surface rounded-lg p-3 flex items-center gap-2"
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <Button
            onClick={login}
            disabled={isLoggingIn}
            data-ocid="landing.login.button"
            className="w-full py-6 text-base font-bold btn-gradient text-background"
          >
            {isLoggingIn ? "Connecting..." : "Login to Trade"}
          </Button>
          <Button
            onClick={login}
            variant="outline"
            disabled={isLoggingIn}
            data-ocid="landing.signup.button"
            className="w-full py-6 text-base font-semibold border-border/50 text-foreground"
          >
            Sign Up Free
          </Button>
        </motion.div>

        <p className="mt-4 text-[11px] text-muted-foreground/60">
          By continuing you agree to our Terms of Service
        </p>
      </motion.div>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  Swords,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAdjustUserCoins,
  useAdminBalance,
  useAdminLogs,
  useAllDepositRequests,
  useAllUserHoldings,
  useAllWithdrawalRequests,
  useApproveDeposit,
  useAssignAdminRole,
  useAssignCoinsToAdmin,
  useCallerAdminRole,
  useClearForcedResult,
  useClearManualOverride,
  useCurrentRoundBets,
  useForceResult,
  useForceResultStatus,
  useGameState,
  useMarkWithdrawalProcessed,
  useMyAdminBalance,
  usePaymentMethod,
  useSetManualResult,
  useSetMultipliers,
  useSetPaymentMethod,
  useToggleAutoResolve,
} from "../hooks/useQueries";
import {
  formatCoins,
  getResultForRound,
  getRoundNumber,
} from "../utils/gameUtils";

const ADMIN_EMAIL = "mrvermatech1@gmail.com";
const ADMIN_PASSWORD = "Verma321";
const ADMIN_AUTH_KEY = "av_admin_auth";

function AdminLoginGate({ onAuth }: { onAuth: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_AUTH_KEY, "1");
      onAuth();
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div
          className="rounded-2xl p-6 space-y-5"
          style={{
            background: "oklch(0.09 0.018 240 / 0.95)",
            border: "1px solid oklch(0.25 0.04 240 / 0.6)",
          }}
        >
          <div className="text-center space-y-1">
            <div className="flex justify-center mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: "oklch(0.57 0.28 300 / 0.2)",
                  border: "1px solid oklch(0.57 0.28 300 / 0.5)",
                }}
              >
                <Lock className="w-5 h-5 text-neon-violet" />
              </div>
            </div>
            <h2 className="text-xl font-black text-foreground">Admin Access</h2>
            <p className="text-xs text-muted-foreground">
              Restricted area. Authorized personnel only.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="bg-muted/30 border-border/40"
              autoComplete="email"
              data-ocid="admin.login.input"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="bg-muted/30 border-border/40"
              autoComplete="current-password"
              data-ocid="admin.login.password.input"
            />
            {error && (
              <p
                className="text-xs text-red-400 text-center"
                data-ocid="admin.login.error_state"
              >
                {error}
              </p>
            )}
          </div>

          <Button
            onClick={handleLogin}
            className="w-full btn-gradient text-background font-bold"
            data-ocid="admin.login.submit_button"
          >
            Sign In
          </Button>

          <div className="text-center">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
              >
                ← Back to app
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem(ADMIN_AUTH_KEY) === "1",
  );

  if (!isAuthenticated) {
    return <AdminLoginGate onAuth={() => setIsAuthenticated(true)} />;
  }

  return (
    <AdminDashboard
      onLogout={() => {
        localStorage.removeItem(ADMIN_AUTH_KEY);
        setIsAuthenticated(false);
      }}
    />
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();
  const gameState = useGameState();
  const holdings = useAllUserHoldings();
  const logs = useAdminLogs();
  const withdrawals = useAllWithdrawalRequests();
  const depositRequests = useAllDepositRequests();
  const paymentMethod = usePaymentMethod();
  const toggleAutoResolve = useToggleAutoResolve();
  const setManualResult = useSetManualResult();
  const clearOverride = useClearManualOverride();
  const setMultipliers = useSetMultipliers();
  const adjustCoins = useAdjustUserCoins();
  const { actor } = useActor();
  const markProcessed = useMarkWithdrawalProcessed();
  const approveDeposit = useApproveDeposit();
  const setPaymentMethod = useSetPaymentMethod();
  const currentRoundBets = useCurrentRoundBets();
  const { identity } = useInternetIdentity();

  // Role detection
  const callerAdminRole = useCallerAdminRole();
  const adminRole = callerAdminRole.data ?? "user";
  const isSuperAdmin = adminRole === "super_admin";
  const isAdminOrAbove = adminRole === "super_admin" || adminRole === "admin";

  // Force result hooks
  const forceResultStatus = useForceResultStatus();
  const forceResult = useForceResult();
  const clearForcedResult = useClearForcedResult();

  // Admin wallet hooks
  const callerPrincipal = identity ? identity.getPrincipal() : null;
  const adminBalance = useAdminBalance(callerPrincipal);
  const myAdminBalance = useMyAdminBalance();
  const assignCoinsToAdmin = useAssignCoinsToAdmin();
  const assignAdminRole = useAssignAdminRole();

  // Super admin setup hooks

  const [multRed, setMultRed] = useState("");
  const [multGreen, setMultGreen] = useState("");
  const [multViolet, setMultViolet] = useState("");
  const [adjustUser, setAdjustUser] = useState("");
  const [adjustAmt, setAdjustAmt] = useState("");
  const [newUpiId, setNewUpiId] = useState("");
  const [newQrUrl, setNewQrUrl] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Admin wallet state
  const [assignAdminPrincipal, setAssignAdminPrincipal] = useState("");
  const [assignCoinAmount, setAssignCoinAmount] = useState("");

  // Role assignment state
  const [rolePrincipal, setRolePrincipal] = useState("");
  const [selectedRole, setSelectedRole] = useState("admin");

  const gs = gameState.data;
  const currentRoundId = getRoundNumber();

  const handleToggleAutoResolve = async () => {
    try {
      await toggleAutoResolve.mutateAsync();
      toast.success("Auto-resolve toggled");
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleSetManualResult = async (color: string) => {
    try {
      await setManualResult.mutateAsync(color);
      toast.success(`Manual result set to ${color}`);
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleClearOverride = async () => {
    try {
      await clearOverride.mutateAsync();
      toast.success("Manual override cleared");
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleSetMultipliers = async () => {
    const r = Number.parseFloat(multRed);
    const g = Number.parseFloat(multGreen);
    const v = Number.parseFloat(multViolet);
    if (!r || !g || !v) {
      toast.error("Invalid multipliers");
      return;
    }
    try {
      await setMultipliers.mutateAsync({ red: r, green: g, violet: v });
      toast.success("Multipliers updated");
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleAdjustCoins = async () => {
    if (!adjustUser || !adjustAmt) {
      toast.error("Fill all fields");
      return;
    }
    try {
      const principal = Principal.fromText(adjustUser);
      const raw = adjustAmt.trim();
      let amount: bigint;

      if (raw.startsWith("+")) {
        amount = BigInt(raw.slice(1));
      } else if (raw.startsWith("-")) {
        amount = -BigInt(raw.slice(1));
      } else {
        if (!actor) throw new Error("Not connected");
        const profile = await actor.getUserProfile(principal);
        const currentCoins = profile ? BigInt(profile.coins) : 0n;
        const target = BigInt(raw);
        amount = target - currentCoins;
      }

      await adjustCoins.mutateAsync({ user: principal, amount });
      toast.success("Coins updated successfully");
      setAdjustUser("");
      setAdjustAmt("");
    } catch (e: any) {
      toast.error(e?.message || "Invalid input");
    }
  };

  const handleSavePaymentMethod = async () => {
    const upi = newUpiId.trim() || paymentMethod.data?.upiId || "";
    const qr = newQrUrl.trim() || paymentMethod.data?.qrImageUrl || "";
    if (!upi) {
      toast.error("UPI ID is required");
      return;
    }
    try {
      await setPaymentMethod.mutateAsync({ upiId: upi, qrImageUrl: qr });
      toast.success("Payment method updated");
      setNewUpiId("");
      setNewQrUrl("");
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleForceResult = async (color: string, size: string) => {
    try {
      await forceResult.mutateAsync({ color, size });
      toast.success(
        `Forced result: ${color.toUpperCase()} / ${size.toUpperCase()}`,
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to force result");
    }
  };

  const handleClearForcedResult = async () => {
    try {
      await clearForcedResult.mutateAsync();
      toast.success("Forced result cleared");
    } catch (e: any) {
      toast.error(e?.message);
    }
  };

  const handleAssignCoins = async () => {
    if (!assignAdminPrincipal || !assignCoinAmount) {
      toast.error("Fill all fields");
      return;
    }
    try {
      const principal = Principal.fromText(assignAdminPrincipal);
      await assignCoinsToAdmin.mutateAsync({
        admin: principal,
        amount: BigInt(assignCoinAmount),
      });
      toast.success("Coins assigned to admin");
      setAssignAdminPrincipal("");
      setAssignCoinAmount("");
    } catch (e: any) {
      toast.error(e?.message || "Invalid input");
    }
  };

  const handleAssignRole = async () => {
    if (!rolePrincipal || !selectedRole) {
      toast.error("Fill all fields");
      return;
    }
    try {
      const principal = Principal.fromText(rolePrincipal);
      await assignAdminRole.mutateAsync({
        user: principal,
        role: selectedRole,
      });
      toast.success(`Role '${selectedRole}' assigned`);
      setRolePrincipal("");
    } catch (e: any) {
      toast.error(e?.message || "Invalid principal");
    }
  };

  const pendingDeposits =
    depositRequests.data?.filter((d) => !d.approved) ?? [];
  const approvedDeposits =
    depositRequests.data?.filter((d) => d.approved) ?? [];

  // Live round stats
  const liveBets = currentRoundBets.data ?? { red: 0n, green: 0n, violet: 0n };
  const totalBets =
    Number(liveBets.red) + Number(liveBets.green) + Number(liveBets.violet);

  const currentBackendRound = gs?.roundHistory?.find(
    (r) => Number(r.roundId) === Number(gs?.currentRoundId),
  );
  const uniquePlayers = currentBackendRound
    ? new Set(currentBackendRound.bets.map(([p]) => p.toString())).size
    : 0;

  // Next 10 rounds preview
  const next10Rounds = Array.from({ length: 10 }, (_, i) => {
    const roundId = currentRoundId + i + 1;
    const result = getResultForRound(roundId);
    return { roundId, result };
  });

  // Force result status
  const frs = forceResultStatus.data;

  // Filtered users
  const filteredHoldings = (holdings.data ?? []).filter(([principal]) =>
    userSearch
      ? principal.toString().toLowerCase().includes(userSearch.toLowerCase())
      : true,
  );

  const toggleUserExpand = (principalStr: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(principalStr)) {
        next.delete(principalStr);
      } else {
        next.add(principalStr);
      }
      return next;
    });
  };

  const colorEmoji = (c: string) =>
    c === "red" ? "🔴" : c === "green" ? "🟢" : "🟣";
  const sizeEmoji = (s: string) => (s === "BIG" ? "⬆️" : "⬇️");

  const BET_COLOR_STATS: Array<{
    label: string;
    key: "red" | "green" | "violet";
    color: string;
    bg: string;
    border: string;
  }> = [
    {
      label: "Red",
      key: "red",
      color: "oklch(0.60 0.22 25)",
      bg: "oklch(0.60 0.22 25 / 0.08)",
      border: "oklch(0.60 0.22 25 / 0.3)",
    },
    {
      label: "Green",
      key: "green",
      color: "oklch(0.85 0.2 168)",
      bg: "oklch(0.85 0.2 168 / 0.08)",
      border: "oklch(0.85 0.2 168 / 0.3)",
    },
    {
      label: "Violet",
      key: "violet",
      color: "oklch(0.57 0.28 300)",
      bg: "oklch(0.57 0.28 300 / 0.08)",
      border: "oklch(0.57 0.28 300 / 0.3)",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="sticky top-0 z-40 border-b border-border/30"
        style={{
          background: "oklch(0.09 0.018 240 / 0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/">
            <Button
              size="sm"
              variant="ghost"
              data-ocid="admin.back.button"
              className="text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <span className="text-xl font-black gradient-logo">Admin Panel</span>
          {/* Role badge */}
          {isSuperAdmin && (
            <Badge
              className="text-[10px] font-bold px-2 py-0.5 ml-1"
              style={{
                background: "oklch(0.57 0.28 300 / 0.25)",
                border: "1px solid oklch(0.57 0.28 300 / 0.6)",
                color: "oklch(0.68 0.25 300)",
              }}
            >
              <Shield className="w-3 h-3 mr-1 inline" />
              SUPER ADMIN
            </Badge>
          )}
          {!isSuperAdmin && isAdminOrAbove && (
            <Badge
              className="text-[10px] font-bold px-2 py-0.5 ml-1"
              style={{
                background: "oklch(0.85 0.2 168 / 0.15)",
                border: "1px solid oklch(0.85 0.2 168 / 0.4)",
                color: "oklch(0.85 0.2 168)",
              }}
            >
              <Swords className="w-3 h-3 mr-1 inline" />
              ADMIN
            </Badge>
          )}
          {isAdminOrAbove && (
            <div
              className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: "oklch(0.85 0.2 168 / 0.12)",
                border: "1px solid oklch(0.85 0.2 168 / 0.35)",
                color: "oklch(0.85 0.2 168)",
              }}
              data-ocid="admin.balance.card"
            >
              <span>💰</span>
              <span>
                {myAdminBalance.isLoading
                  ? "..."
                  : formatCoins(myAdminBalance.data ?? 0n)}{" "}
                coins
              </span>
            </div>
          )}
          {callerPrincipal && (
            <div
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono"
              style={{
                background: "oklch(0.14 0.02 240 / 0.8)",
                border: "1px solid oklch(0.25 0.04 240 / 0.6)",
                color: "oklch(0.55 0.03 240)",
              }}
              title={callerPrincipal.toString()}
            >
              <span style={{ color: "oklch(0.68 0.25 300)" }}>ID:</span>
              <span>{callerPrincipal.toString().slice(0, 12)}...</span>
            </div>
          )}
          <div className="ml-auto">
            <Button
              size="sm"
              variant="ghost"
              onClick={onLogout}
              className="text-xs text-muted-foreground"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Tabs defaultValue="deposits" data-ocid="admin.tab">
          <TabsList className="bg-muted/30 border border-border/30 mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="deposits" data-ocid="admin.deposits.tab">
              Deposits
              {pendingDeposits.length > 0 && (
                <Badge className="ml-1 text-[9px] bg-neon-green/20 text-neon-green border-neon-green/30 h-4 px-1">
                  {pendingDeposits.length}
                </Badge>
              )}
            </TabsTrigger>
            {/* Game Control: SUPER ADMIN ONLY */}
            {isSuperAdmin && (
              <TabsTrigger value="game" data-ocid="admin.game.tab">
                Game Control
              </TabsTrigger>
            )}
            <TabsTrigger value="payment" data-ocid="admin.payment.tab">
              Payment
            </TabsTrigger>
            <TabsTrigger value="users" data-ocid="admin.users.tab">
              Users
            </TabsTrigger>
            <TabsTrigger value="withdrawals" data-ocid="admin.withdrawals.tab">
              Withdrawals
            </TabsTrigger>
            <TabsTrigger value="logs" data-ocid="admin.logs.tab">
              Logs
            </TabsTrigger>
            {/* Admin Wallet: SUPER ADMIN ONLY */}
            {isSuperAdmin && (
              <TabsTrigger
                value="adminwallet"
                data-ocid="admin.adminwallet.tab"
              >
                Admin Wallet
              </TabsTrigger>
            )}
          </TabsList>

          {/* DEPOSITS TAB */}
          <TabsContent value="deposits">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="card-surface rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 text-foreground">
                  Pending Deposits ({pendingDeposits.length})
                </h3>
                <ScrollArea className="h-64">
                  <div
                    className="space-y-2"
                    data-ocid="admin.deposits.pending.list"
                  >
                    {depositRequests.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : pendingDeposits.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No pending deposits
                      </p>
                    ) : (
                      pendingDeposits.map((req, i) => (
                        <div
                          key={`deposit-pending-${Number(req.index)}`}
                          className="flex items-center justify-between p-3 rounded-lg border"
                          style={{
                            background: "oklch(0.85 0.2 168 / 0.05)",
                            border: "1px solid oklch(0.85 0.2 168 / 0.2)",
                          }}
                          data-ocid={`admin.deposits.pending.item.${i + 1}`}
                        >
                          <div>
                            <p className="text-xs font-mono text-muted-foreground">
                              {req.user.toString().slice(0, 16)}...
                            </p>
                            <p className="text-sm font-bold text-foreground">
                              ₹{Number(req.amount)}
                              {Number(req.bonusAmount) > 0 && (
                                <span className="text-xs font-normal text-neon-violet ml-1">
                                  +{Number(req.bonusAmount)} bonus
                                </span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                await approveDeposit.mutateAsync(req.index);
                                toast.success(
                                  "Deposit approved & coins credited!",
                                );
                                // Force-refetch so user's betting lock lifts immediately
                                queryClient.invalidateQueries({
                                  queryKey: ["callerApprovedDepositTotal"],
                                });
                                queryClient.refetchQueries({
                                  queryKey: ["callerApprovedDepositTotal"],
                                });
                                queryClient.invalidateQueries({
                                  queryKey: ["hasApprovedDeposit"],
                                });
                                queryClient.refetchQueries({
                                  queryKey: ["hasApprovedDeposit"],
                                });
                                queryClient.invalidateQueries({
                                  queryKey: ["userProfile"],
                                });
                              } catch (e: any) {
                                toast.error(e?.message);
                              }
                            }}
                            disabled={approveDeposit.isPending}
                            data-ocid={`admin.deposits.approve_button.${i + 1}`}
                            className="text-xs h-7 btn-gradient text-background font-bold"
                          >
                            {approveDeposit.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Approve"
                            )}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {approvedDeposits.length > 0 && (
                <div className="card-surface rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                    Approved Deposits ({approvedDeposits.length})
                  </h3>
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {approvedDeposits.map((req, _i) => (
                        <div
                          key={`deposit-approved-${Number(req.index)}`}
                          className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/10"
                        >
                          <p className="text-xs font-mono text-muted-foreground">
                            {req.user.toString().slice(0, 16)}...
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-foreground">
                              ₹{Number(req.amount)}
                            </span>
                            <Badge className="text-[10px] bg-neon-green/20 text-neon-green border-neon-green/30">
                              Approved
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* GAME CONTROL TAB — SUPER ADMIN ONLY */}
          {isSuperAdmin && (
            <TabsContent value="game">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Force Result Section */}
                <div
                  className="card-surface rounded-xl p-4"
                  data-ocid="admin.game.force_result.card"
                >
                  <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-neon-violet" />
                    Force Result
                  </h3>

                  {/* Status banner */}
                  {frs?.isActive && (
                    <div
                      className="mb-3 px-3 py-2 rounded-lg text-xs font-bold"
                      style={{
                        background: "oklch(0.57 0.28 300 / 0.15)",
                        border: "1px solid oklch(0.57 0.28 300 / 0.5)",
                        color: "oklch(0.68 0.25 300)",
                      }}
                      data-ocid="admin.game.force_active.success_state"
                    >
                      ⚡ Forced Result Active:{" "}
                      {frs.forcedColor?.toUpperCase() ?? "AUTO"} /{" "}
                      {frs.forcedSize?.toUpperCase() ?? "AUTO"}
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground mb-2">
                    Force color (size stays auto):
                  </p>
                  <div className="flex gap-2 mb-3">
                    {["red", "green", "violet"].map((c) => (
                      <Button
                        key={c}
                        size="sm"
                        data-ocid={`admin.force_${c}.button`}
                        onClick={() => handleForceResult(c, "auto")}
                        disabled={forceResult.isPending}
                        className="capitalize flex-1"
                        style={{
                          background:
                            c === "red"
                              ? "oklch(0.60 0.22 25 / 0.3)"
                              : c === "green"
                                ? "oklch(0.85 0.2 168 / 0.3)"
                                : "oklch(0.57 0.28 300 / 0.3)",
                          border: `1px solid ${
                            c === "red"
                              ? "oklch(0.60 0.22 25)"
                              : c === "green"
                                ? "oklch(0.85 0.2 168)"
                                : "oklch(0.57 0.28 300)"
                          }`,
                          color: "white",
                        }}
                      >
                        {c === "red" ? "🔴" : c === "green" ? "🟢" : "🟣"} {c}
                      </Button>
                    ))}
                  </div>

                  <p className="text-[11px] text-muted-foreground mb-2">
                    Force size (color stays auto):
                  </p>
                  <div className="flex gap-2 mb-3">
                    <Button
                      size="sm"
                      data-ocid="admin.force_big.button"
                      onClick={() => handleForceResult("auto", "big")}
                      disabled={forceResult.isPending}
                      className="flex-1"
                      style={{
                        background: "oklch(0.72 0.18 220 / 0.3)",
                        border: "1px solid oklch(0.72 0.18 220)",
                        color: "white",
                      }}
                    >
                      ⬆️ BIG
                    </Button>
                    <Button
                      size="sm"
                      data-ocid="admin.force_small.button"
                      onClick={() => handleForceResult("auto", "small")}
                      disabled={forceResult.isPending}
                      className="flex-1"
                      style={{
                        background: "oklch(0.72 0.22 50 / 0.3)",
                        border: "1px solid oklch(0.72 0.22 50)",
                        color: "white",
                      }}
                    >
                      ⬇️ SMALL
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-ocid="admin.clear_force.button"
                      onClick={handleClearForcedResult}
                      disabled={clearForcedResult.isPending}
                      className="flex-1"
                    >
                      {clearForcedResult.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Clear
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Live Round Stats */}
                <div
                  className="card-surface rounded-xl p-4"
                  data-ocid="admin.game.round_stats.card"
                >
                  <h3 className="text-sm font-semibold mb-3 text-foreground">
                    Live Round Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div
                      className="rounded-lg p-3"
                      style={{
                        background: "oklch(0.57 0.28 300 / 0.08)",
                        border: "1px solid oklch(0.57 0.28 300 / 0.3)",
                      }}
                    >
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                        Round #
                      </div>
                      <div
                        className="text-xl font-black"
                        style={{ color: "oklch(0.68 0.25 300)" }}
                      >
                        {currentRoundId}
                      </div>
                    </div>
                    <div
                      className="rounded-lg p-3"
                      style={{
                        background: "oklch(0.72 0.18 220 / 0.08)",
                        border: "1px solid oklch(0.72 0.18 220 / 0.3)",
                      }}
                    >
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                        Players
                      </div>
                      <div
                        className="text-xl font-black"
                        style={{ color: "oklch(0.72 0.18 220)" }}
                      >
                        {uniquePlayers}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {BET_COLOR_STATS.map(
                      ({ label, key, color, bg, border }) => (
                        <div
                          key={key}
                          className="rounded-lg p-2.5 text-center"
                          style={{
                            background: bg,
                            border: `1px solid ${border}`,
                          }}
                        >
                          <div className="text-[10px] text-muted-foreground mb-0.5">
                            {label}
                          </div>
                          <div className="text-sm font-black" style={{ color }}>
                            {formatCoins(liveBets[key])}
                          </div>
                        </div>
                      ),
                    )}
                  </div>

                  <div
                    className="rounded-lg p-2 text-center"
                    style={{
                      background: "oklch(0.85 0.2 168 / 0.05)",
                      border: "1px solid oklch(0.85 0.2 168 / 0.2)",
                    }}
                  >
                    <span className="text-xs text-muted-foreground">
                      Total bets:{" "}
                    </span>
                    <span className="text-xs font-bold text-neon-green">
                      {formatCoins(totalBets)}
                    </span>
                  </div>
                </div>

                {/* Next 10 Rounds Preview */}
                <div
                  className="card-surface rounded-xl p-4"
                  data-ocid="admin.game.next_rounds.card"
                >
                  <h3 className="text-sm font-semibold mb-3 text-foreground">
                    Next 10 Rounds Preview
                  </h3>
                  <div className="space-y-1.5">
                    {next10Rounds.map(({ roundId, result }) => (
                      <div
                        key={roundId}
                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/10"
                      >
                        <span className="text-xs text-muted-foreground">
                          Round{" "}
                          <span className="font-mono font-bold text-foreground">
                            #{roundId}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background:
                                result.color === "red"
                                  ? "oklch(0.60 0.22 25 / 0.15)"
                                  : result.color === "green"
                                    ? "oklch(0.85 0.2 168 / 0.1)"
                                    : "oklch(0.57 0.28 300 / 0.15)",
                              color:
                                result.color === "red"
                                  ? "oklch(0.70 0.20 25)"
                                  : result.color === "green"
                                    ? "oklch(0.85 0.2 168)"
                                    : "oklch(0.68 0.25 300)",
                            }}
                          >
                            {colorEmoji(result.color)}{" "}
                            {result.color.toUpperCase()}
                          </span>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background:
                                result.size === "BIG"
                                  ? "oklch(0.72 0.18 220 / 0.1)"
                                  : "oklch(0.72 0.22 50 / 0.1)",
                              color:
                                result.size === "BIG"
                                  ? "oklch(0.72 0.18 220)"
                                  : "oklch(0.72 0.22 50)",
                            }}
                          >
                            {sizeEmoji(result.size)} {result.size}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 text-center">
                    Deterministic previews based on round algorithm
                  </p>
                </div>

                {/* Game Mode */}
                <div className="card-surface rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 text-foreground">
                    Game Mode
                  </h3>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={gs?.autoResolve ?? true}
                      onCheckedChange={handleToggleAutoResolve}
                      disabled={toggleAutoResolve.isPending}
                      data-ocid="admin.auto_resolve.switch"
                    />
                    <span className="text-sm text-foreground">
                      {gs?.autoResolve ? "Auto Resolve" : "Manual Override"}
                    </span>
                    {toggleAutoResolve.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {!gs?.autoResolve && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Set manual result:
                      </p>
                      <div className="flex gap-2">
                        {["red", "green", "violet"].map((c) => (
                          <Button
                            key={c}
                            size="sm"
                            data-ocid={`admin.manual_${c}.button`}
                            onClick={() => handleSetManualResult(c)}
                            disabled={setManualResult.isPending}
                            className={`capitalize ${
                              gs?.manualResult === c
                                ? "opacity-100"
                                : "opacity-60"
                            }`}
                            style={{
                              background:
                                c === "red"
                                  ? "oklch(0.60 0.22 25 / 0.3)"
                                  : c === "green"
                                    ? "oklch(0.85 0.2 168 / 0.3)"
                                    : "oklch(0.57 0.28 300 / 0.3)",
                              border: `1px solid ${
                                c === "red"
                                  ? "oklch(0.60 0.22 25)"
                                  : c === "green"
                                    ? "oklch(0.85 0.2 168)"
                                    : "oklch(0.57 0.28 300)"
                              }`,
                              color: "white",
                            }}
                          >
                            {c}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          data-ocid="admin.clear_override.button"
                          onClick={handleClearOverride}
                          disabled={clearOverride.isPending}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {gs?.manualResult && (
                        <p className="text-xs">
                          Current override:{" "}
                          <span className="font-bold text-neon-violet">
                            {gs.manualResult}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Multipliers */}
                <div className="card-surface rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 text-foreground">
                    Multipliers
                  </h3>
                  <div className="text-xs text-muted-foreground mb-2">
                    Current: Red={gs?.multipliers.red}x | Green=
                    {gs?.multipliers.green}x | Violet={gs?.multipliers.violet}x
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Red"
                      value={multRed}
                      onChange={(e) => setMultRed(e.target.value)}
                      data-ocid="admin.mult_red.input"
                      className="bg-muted/30 border-border/40 text-sm"
                    />
                    <Input
                      placeholder="Green"
                      value={multGreen}
                      onChange={(e) => setMultGreen(e.target.value)}
                      data-ocid="admin.mult_green.input"
                      className="bg-muted/30 border-border/40 text-sm"
                    />
                    <Input
                      placeholder="Violet"
                      value={multViolet}
                      onChange={(e) => setMultViolet(e.target.value)}
                      data-ocid="admin.mult_violet.input"
                      className="bg-muted/30 border-border/40 text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleSetMultipliers}
                      disabled={setMultipliers.isPending}
                      data-ocid="admin.mult.save_button"
                      className="btn-gradient text-background font-bold"
                    >
                      {setMultipliers.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          )}

          {/* PAYMENT METHOD TAB */}
          <TabsContent value="payment">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="card-surface rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-1 text-foreground">
                  Current Payment Method
                </h3>
                <div className="text-xs text-muted-foreground mb-3">
                  UPI ID:{" "}
                  <span className="font-mono text-foreground">
                    {paymentMethod.data?.upiId}
                  </span>
                </div>
                {paymentMethod.data?.qrImageUrl && (
                  <div className="mb-4">
                    <div
                      className="rounded-xl overflow-hidden p-2 inline-block"
                      style={{ background: "white" }}
                    >
                      <img
                        src={paymentMethod.data.qrImageUrl}
                        alt="Current QR"
                        className="w-28 h-28 object-contain"
                      />
                    </div>
                  </div>
                )}

                <h3 className="text-sm font-semibold mb-3 text-foreground">
                  Update Payment Method
                </h3>
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="admin-upi"
                      className="text-xs text-muted-foreground mb-1 block"
                    >
                      New UPI ID
                    </label>
                    <Input
                      placeholder={paymentMethod.data?.upiId ?? "UPI ID"}
                      value={newUpiId}
                      onChange={(e) => setNewUpiId(e.target.value)}
                      id="admin-upi"
                      data-ocid="admin.payment.upi_input"
                      className="bg-muted/30 border-border/40 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="admin-qr"
                      className="text-xs text-muted-foreground mb-1 block"
                    >
                      QR Image URL
                    </label>
                    <Input
                      placeholder="https://... or /assets/..."
                      value={newQrUrl}
                      onChange={(e) => setNewQrUrl(e.target.value)}
                      id="admin-qr"
                      data-ocid="admin.payment.qr_input"
                      className="bg-muted/30 border-border/40 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Enter a public URL for the QR image. Leave blank to keep
                      current.
                    </p>
                  </div>
                  <Button
                    onClick={handleSavePaymentMethod}
                    disabled={setPaymentMethod.isPending}
                    data-ocid="admin.payment.save_button"
                    className="btn-gradient text-background font-bold w-full"
                  >
                    {setPaymentMethod.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Save Payment Method"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="card-surface rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 text-foreground">
                  Adjust User Coins
                </h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Principal ID"
                    value={adjustUser}
                    onChange={(e) => setAdjustUser(e.target.value)}
                    data-ocid="admin.adjust_user.input"
                    className="bg-muted/30 border-border/40 text-sm flex-1"
                  />
                  <Input
                    placeholder="+add / -deduct / set"
                    value={adjustAmt}
                    onChange={(e) => setAdjustAmt(e.target.value)}
                    data-ocid="admin.adjust_amount.input"
                    className="bg-muted/30 border-border/40 text-sm w-32"
                  />
                  <Button
                    size="sm"
                    onClick={handleAdjustCoins}
                    disabled={adjustCoins.isPending}
                    data-ocid="admin.adjust.submit_button"
                    className="btn-gradient text-background font-bold"
                  >
                    {adjustCoins.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
              </div>

              <div className="card-surface rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    All Users ({filteredHoldings.length})
                  </h3>
                </div>
                <Input
                  placeholder="Search by Principal ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  data-ocid="admin.users.search_input"
                  className="bg-muted/30 border-border/40 text-sm mb-3"
                />
                <ScrollArea className="h-80">
                  <div className="space-y-1" data-ocid="admin.users.list">
                    {holdings.isLoading ? (
                      <div
                        className="flex items-center justify-center py-8"
                        data-ocid="admin.users.loading_state"
                      >
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredHoldings.length === 0 ? (
                      <p
                        className="text-xs text-muted-foreground py-4 text-center"
                        data-ocid="admin.users.empty_state"
                      >
                        {userSearch
                          ? "No users match search"
                          : "No users found"}
                      </p>
                    ) : (
                      filteredHoldings.map(([principal, coins], i) => {
                        const principalStr = principal.toString();
                        const isExpanded = expandedUsers.has(principalStr);

                        const userDeposits = (
                          depositRequests.data ?? []
                        ).filter((r) => r.user.toString() === principalStr);
                        const userWithdrawals = (withdrawals.data ?? []).filter(
                          ([p]) => p.toString() === principalStr,
                        );
                        const totalDeposited = userDeposits
                          .filter((r) => r.approved)
                          .reduce((sum, r) => sum + Number(r.amount), 0);
                        const totalWithdrawn = userWithdrawals
                          .filter(([, r]) => r.processed)
                          .reduce((sum, [, r]) => sum + Number(r.amount), 0);

                        // Count bets from game state round history
                        const allBets = (gs?.roundHistory ?? []).flatMap(
                          (round) =>
                            round.bets.filter(
                              ([p]) => p.toString() === principalStr,
                            ),
                        );

                        return (
                          <div
                            key={principalStr}
                            className="rounded-lg overflow-hidden"
                            data-ocid={`admin.users.item.${i + 1}`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleUserExpand(principalStr)}
                              className="w-full flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/10 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                                <span className="text-xs font-mono text-muted-foreground truncate">
                                  {principalStr.slice(0, 20)}...
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant="outline"
                                  className="text-xs text-neon-green border-neon-green/30"
                                >
                                  {formatCoins(coins)}
                                </Badge>
                              </div>
                            </button>

                            {isExpanded && (
                              <div
                                className="px-3 pb-3 space-y-2"
                                style={{
                                  background: "oklch(0.11 0.02 240 / 0.5)",
                                  borderTop:
                                    "1px solid oklch(0.25 0.04 240 / 0.3)",
                                }}
                              >
                                {/* Principal full */}
                                <div className="pt-2">
                                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">
                                    Principal ID
                                  </p>
                                  <button
                                    type="button"
                                    className="text-[10px] font-mono text-foreground cursor-pointer hover:text-neon-green transition-colors break-all text-left w-full"
                                    onClick={() => {
                                      navigator.clipboard?.writeText(
                                        principalStr,
                                      );
                                      toast.success("Copied!");
                                    }}
                                    title="Click to copy"
                                  >
                                    {principalStr}
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  <div
                                    className="rounded-md p-2"
                                    style={{
                                      background: "oklch(0.85 0.2 168 / 0.07)",
                                      border:
                                        "1px solid oklch(0.85 0.2 168 / 0.2)",
                                    }}
                                  >
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                      Balance
                                    </div>
                                    <div className="text-sm font-bold text-neon-green">
                                      {formatCoins(coins)}
                                    </div>
                                  </div>
                                  <div
                                    className="rounded-md p-2"
                                    style={{
                                      background: "oklch(0.72 0.18 220 / 0.07)",
                                      border:
                                        "1px solid oklch(0.72 0.18 220 / 0.2)",
                                    }}
                                  >
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                      Bets
                                    </div>
                                    <div
                                      className="text-sm font-bold"
                                      style={{ color: "oklch(0.72 0.18 220)" }}
                                    >
                                      {allBets.length}
                                    </div>
                                  </div>
                                  <div
                                    className="rounded-md p-2"
                                    style={{
                                      background: "oklch(0.57 0.28 300 / 0.07)",
                                      border:
                                        "1px solid oklch(0.57 0.28 300 / 0.2)",
                                    }}
                                  >
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                      Deposits
                                    </div>
                                    <div
                                      className="text-sm font-bold"
                                      style={{ color: "oklch(0.68 0.25 300)" }}
                                    >
                                      {userDeposits.length}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div
                                    className="rounded-md p-2"
                                    style={{
                                      background: "oklch(0.85 0.2 168 / 0.07)",
                                      border:
                                        "1px solid oklch(0.85 0.2 168 / 0.2)",
                                    }}
                                  >
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                      Total Deposited
                                    </div>
                                    <div className="text-sm font-bold text-neon-green">
                                      {formatCoins(totalDeposited)}
                                    </div>
                                  </div>
                                  <div
                                    className="rounded-md p-2"
                                    style={{
                                      background: "oklch(0.60 0.22 25 / 0.07)",
                                      border:
                                        "1px solid oklch(0.60 0.22 25 / 0.2)",
                                    }}
                                  >
                                    <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                      Total Withdrawn
                                    </div>
                                    <div
                                      className="text-sm font-bold"
                                      style={{ color: "oklch(0.70 0.18 25)" }}
                                    >
                                      {formatCoins(totalWithdrawn)}
                                    </div>
                                  </div>
                                </div>

                                {userDeposits.length > 0 && (
                                  <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                      Deposits ({userDeposits.length})
                                    </p>
                                    <div className="space-y-1">
                                      {userDeposits
                                        .slice(0, 3)
                                        .map((dep, di) => (
                                          <div
                                            key={`udep-${String(dep.index)}-${di}`}
                                            className="flex items-center justify-between text-xs py-0.5"
                                          >
                                            <span className="text-muted-foreground">
                                              {new Date(
                                                Number(dep.requestTime) /
                                                  1_000_000,
                                              ).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <span className="font-bold text-foreground">
                                                ₹{Number(dep.amount)}
                                              </span>
                                              <Badge
                                                className={`text-[9px] h-4 ${
                                                  dep.approved
                                                    ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                                }`}
                                              >
                                                {dep.approved
                                                  ? "OK"
                                                  : "Pending"}
                                              </Badge>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {userWithdrawals.length > 0 && (
                                  <div>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                      Withdrawals ({userWithdrawals.length})
                                    </p>
                                    <div className="space-y-1">
                                      {userWithdrawals
                                        .slice(0, 3)
                                        .map(([, wr], wi) => (
                                          <div
                                            key={`uwr-${String(wr.requestTime)}-${wi}`}
                                            className="flex items-center justify-between text-xs py-0.5"
                                          >
                                            <span className="text-muted-foreground">
                                              {new Date(
                                                Number(wr.requestTime) /
                                                  1_000_000,
                                              ).toLocaleDateString()}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <span className="font-bold text-foreground">
                                                {formatCoins(wr.amount)}
                                              </span>
                                              <Badge
                                                className={`text-[9px] h-4 ${
                                                  wr.processed
                                                    ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                                }`}
                                              >
                                                {wr.processed ? "Done" : "Pend"}
                                              </Badge>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setAdjustUser(principalStr)}
                                  className="text-[10px] font-semibold px-2 py-1 rounded-md w-full text-center mt-1"
                                  style={{
                                    background: "oklch(0.57 0.28 300 / 0.12)",
                                    color: "oklch(0.68 0.25 300)",
                                    border:
                                      "1px solid oklch(0.57 0.28 300 / 0.3)",
                                  }}
                                >
                                  Use in Adjust Coins ↑
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          </TabsContent>

          {/* WITHDRAWALS TAB */}
          <TabsContent value="withdrawals">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="card-surface rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 text-foreground">
                  Withdrawal Requests
                </h3>
                <ScrollArea className="h-80">
                  <div className="space-y-2" data-ocid="admin.withdrawals.list">
                    {withdrawals.isLoading ? (
                      <div
                        className="flex items-center justify-center py-8"
                        data-ocid="admin.withdrawals.loading_state"
                      >
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : withdrawals.data?.length === 0 ? (
                      <p
                        className="text-xs text-muted-foreground py-4 text-center"
                        data-ocid="admin.withdrawals.empty_state"
                      >
                        No withdrawal requests
                      </p>
                    ) : (
                      withdrawals.data?.map(([principal, req], i) => (
                        <div
                          key={`${principal.toString()}-${i}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/20"
                          data-ocid={`admin.withdrawals.item.${i + 1}`}
                        >
                          <div>
                            <p className="text-xs font-mono text-muted-foreground">
                              {principal.toString().slice(0, 16)}...
                            </p>
                            <p className="text-sm font-bold text-foreground">
                              {formatCoins(req.amount)} coins
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {req.processed ? (
                              <Badge className="text-[10px] bg-neon-green/20 text-neon-green border-neon-green/30">
                                Processed
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await markProcessed.mutateAsync({
                                      user: principal,
                                      index: BigInt(i),
                                    });
                                    toast.success("Marked as processed");
                                  } catch (e: any) {
                                    toast.error(e?.message);
                                  }
                                }}
                                disabled={markProcessed.isPending}
                                data-ocid={`admin.withdrawals.process_button.${i + 1}`}
                                className="text-xs h-7 btn-gradient text-background font-bold"
                              >
                                Mark Processed
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          </TabsContent>

          {/* LOGS TAB */}
          <TabsContent value="logs">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="card-surface rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 text-foreground">
                  System Logs
                </h3>
                <ScrollArea className="h-96">
                  <div className="space-y-1" data-ocid="admin.logs.list">
                    {logs.isLoading ? (
                      <div
                        className="flex items-center justify-center py-8"
                        data-ocid="admin.logs.loading_state"
                      >
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : logs.data?.length === 0 ? (
                      <p
                        className="text-xs text-muted-foreground py-4 text-center"
                        data-ocid="admin.logs.empty_state"
                      >
                        No logs yet
                      </p>
                    ) : (
                      logs.data
                        ?.slice()
                        .reverse()
                        .map((log, i) => (
                          <div
                            key={`log-${log.slice(0, 40)}-${i}`}
                            className="py-1.5 px-2 rounded-md hover:bg-muted/10"
                            data-ocid={`admin.logs.item.${i + 1}`}
                          >
                            <p className="text-xs font-mono text-muted-foreground">
                              {log}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          </TabsContent>

          {/* ADMIN WALLET TAB — SUPER ADMIN ONLY */}
          {isSuperAdmin && (
            <TabsContent value="adminwallet">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* My Admin Balance */}
                <div
                  className="card-surface rounded-xl p-4"
                  data-ocid="admin.adminwallet.card"
                >
                  <h3 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-neon-violet" />
                    My Admin Balance
                  </h3>
                  <div
                    className="rounded-lg p-4 text-center mb-2"
                    style={{
                      background: "oklch(0.57 0.28 300 / 0.1)",
                      border: "1px solid oklch(0.57 0.28 300 / 0.4)",
                    }}
                  >
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      Balance
                    </div>
                    <div
                      className="text-3xl font-black"
                      style={{ color: "oklch(0.68 0.25 300)" }}
                    >
                      {adminBalance.isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin inline" />
                      ) : (
                        formatCoins(adminBalance.data ?? 0n)
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      coins
                    </div>
                  </div>
                  {callerPrincipal && (
                    <p className="text-[10px] text-muted-foreground font-mono break-all">
                      {callerPrincipal.toString()}
                    </p>
                  )}
                </div>

                {/* Assign Coins to Admin */}
                <div className="card-surface rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 text-foreground">
                    Assign Coins to Admin
                  </h3>
                  <div className="space-y-3">
                    <Input
                      placeholder="Admin Principal ID"
                      value={assignAdminPrincipal}
                      onChange={(e) => setAssignAdminPrincipal(e.target.value)}
                      data-ocid="admin.adminwallet.principal.input"
                      className="bg-muted/30 border-border/40 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Amount of coins"
                      value={assignCoinAmount}
                      onChange={(e) => setAssignCoinAmount(e.target.value)}
                      data-ocid="admin.adminwallet.amount.input"
                      className="bg-muted/30 border-border/40 text-sm"
                    />
                    <Button
                      onClick={handleAssignCoins}
                      disabled={assignCoinsToAdmin.isPending}
                      data-ocid="admin.adminwallet.assign.submit_button"
                      className="w-full btn-gradient text-background font-bold"
                    >
                      {assignCoinsToAdmin.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Assign Coins"
                      )}
                    </Button>
                  </div>
                </div>

                {/* Assign Admin Roles */}
                <div className="card-surface rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3 text-foreground">
                    Assign Admin Role
                  </h3>
                  <div className="space-y-3">
                    <Input
                      placeholder="User Principal ID"
                      value={rolePrincipal}
                      onChange={(e) => setRolePrincipal(e.target.value)}
                      data-ocid="admin.adminwallet.roleprincipal.input"
                      className="bg-muted/30 border-border/40 text-sm"
                    />
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                    >
                      <SelectTrigger
                        data-ocid="admin.adminwallet.role.select"
                        className="bg-muted/30 border-border/40 text-sm"
                      >
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="user">
                          User (revoke admin)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAssignRole}
                      disabled={assignAdminRole.isPending}
                      data-ocid="admin.adminwallet.assignrole.submit_button"
                      className="w-full btn-gradient text-background font-bold"
                    >
                      {assignAdminRole.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Assign Role"
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">
                      Only super admin can assign or revoke admin roles.
                    </p>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@icp-sdk/core/principal";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import {
  useAdjustUserCoins,
  useAdminLogs,
  useAllDepositRequests,
  useAllUserHoldings,
  useAllWithdrawalRequests,
  useApproveDeposit,
  useClearManualOverride,
  useGameState,
  useMarkWithdrawalProcessed,
  usePaymentMethod,
  useSetManualResult,
  useSetMultipliers,
  useSetPaymentMethod,
  useToggleAutoResolve,
} from "../hooks/useQueries";
import { formatCoins } from "../utils/gameUtils";

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
            />
            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}
          </div>

          <Button
            onClick={handleLogin}
            className="w-full btn-gradient text-background font-bold"
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

  const [multRed, setMultRed] = useState("");
  const [multGreen, setMultGreen] = useState("");
  const [multViolet, setMultViolet] = useState("");
  const [adjustUser, setAdjustUser] = useState("");
  const [adjustAmt, setAdjustAmt] = useState("");
  const [newUpiId, setNewUpiId] = useState("");
  const [newQrUrl, setNewQrUrl] = useState("");

  const gs = gameState.data;

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
        // Add the specific amount
        amount = BigInt(raw.slice(1));
      } else if (raw.startsWith("-")) {
        // Deduct the specific amount
        amount = -BigInt(raw.slice(1));
      } else {
        // No sign — set balance directly to this amount
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

  const pendingDeposits =
    depositRequests.data?.filter((d) => !d.approved) ?? [];
  const approvedDeposits =
    depositRequests.data?.filter((d) => d.approved) ?? [];

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
            <TabsTrigger value="game" data-ocid="admin.game.tab">
              Game Control
            </TabsTrigger>
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

          {/* GAME CONTROL TAB */}
          <TabsContent value="game">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
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
                <h3 className="text-sm font-semibold mb-3 text-foreground">
                  All Users ({holdings.data?.length ?? 0})
                </h3>
                <ScrollArea className="h-64">
                  <div className="space-y-1" data-ocid="admin.users.list">
                    {holdings.isLoading ? (
                      <div
                        className="flex items-center justify-center py-8"
                        data-ocid="admin.users.loading_state"
                      >
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : holdings.data?.length === 0 ? (
                      <p
                        className="text-xs text-muted-foreground py-4 text-center"
                        data-ocid="admin.users.empty_state"
                      >
                        No users found
                      </p>
                    ) : (
                      holdings.data?.map(([principal, coins], i) => (
                        <div
                          key={principal.toString()}
                          className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/10 transition-colors"
                          data-ocid={`admin.users.item.${i + 1}`}
                        >
                          <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                            {principal.toString()}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs text-neon-green border-neon-green/30"
                          >
                            {formatCoins(coins)}
                          </Badge>
                        </div>
                      ))
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
                                data-ocid={`admin.withdrawals.confirm_button.${i + 1}`}
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
                  Game Logs
                </h3>
                <ScrollArea className="h-96 font-mono">
                  <div className="space-y-1" data-ocid="admin.logs.panel">
                    {logs.isLoading ? (
                      <div
                        data-ocid="admin.logs.loading_state"
                        className="flex items-center justify-center py-8"
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
                      logs.data?.map((log, i) => (
                        <div
                          key={`log-${i}-${log.slice(0, 20)}`}
                          className="text-[11px] text-muted-foreground py-0.5 border-b border-border/10 font-mono"
                        >
                          <span className="text-neon-green/50 mr-2">
                            [{i + 1}]
                          </span>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

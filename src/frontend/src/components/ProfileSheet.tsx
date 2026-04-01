import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Flame,
  Gift,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import {
  useClaimBonus,
  usePaymentMethod,
  useRequestWithdrawal,
  useSubmitDepositRequest,
} from "../hooks/useQueries";
import { canClaimBonus, formatCoins } from "../utils/gameUtils";

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  shortPrincipal: string;
}

export function ProfileSheet({
  open,
  onClose,
  profile,
  shortPrincipal,
}: ProfileSheetProps) {
  const [activeTab, setActiveTab] = useState<"wallet" | "history" | "withdraw">(
    "wallet",
  );
  const [depositStep, setDepositStep] = useState<
    "enter" | "pay" | "confirm" | "submitted"
  >("enter");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [copied, setCopied] = useState(false);

  const submitDeposit = useSubmitDepositRequest();
  const withdraw = useRequestWithdrawal();
  const claimBonus = useClaimBonus();
  const paymentMethod = usePaymentMethod();

  const upiId = paymentMethod.data?.upiId ?? "6205006521@okbizaxis";
  const qrImageUrl =
    paymentMethod.data?.qrImageUrl ??
    "/assets/fd4426e3-53eb-407e-a99a-c7978d669943_image-019d4ab9-3854-716b-93ac-e620b7e024db.png";

  const coins = profile?.coins ?? 0n;
  const streak = profile?.dailyStreak ?? 0n;
  const bonusAvailable = profile ? canClaimBonus(profile.lastBonusTime) : false;
  const betHistory = profile?.betHistory ?? [];
  const withdrawalRequests = profile?.withdrawalRequests ?? [];

  const parsedAmount = Number.parseInt(depositAmount, 10);
  const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const qualifiesForBonus = isValidAmount && parsedAmount >= 100;
  const coinsToCredit = isValidAmount ? parsedAmount : 0;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDeposit = async () => {
    try {
      await submitDeposit.mutateAsync(BigInt(parsedAmount));
      setDepositStep("submitted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit deposit request");
    }
  };

  const handleWithdraw = async () => {
    const amt = Number.parseInt(withdrawAmount, 10);
    if (!amt || amt <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (BigInt(amt) > coins) {
      toast.error("Insufficient coins");
      return;
    }
    try {
      await withdraw.mutateAsync(BigInt(amt));
      toast.success(`Withdrawal of ${amt} coins requested!`);
      setWithdrawAmount("");
    } catch (e: any) {
      toast.error(e?.message || "Withdrawal failed");
    }
  };

  const handleClaimBonus = async () => {
    try {
      await claimBonus.mutateAsync();
      toast.success("Daily bonus claimed! 🎁");
    } catch (e: any) {
      toast.error(e?.message || "Failed to claim bonus");
    }
  };

  const resetDeposit = () => {
    setDepositStep("enter");
    setDepositAmount("");
  };

  const tabStyle = (tab: typeof activeTab) => ({
    background:
      activeTab === tab ? "oklch(0.85 0.2 168 / 0.15)" : "transparent",
    border:
      activeTab === tab
        ? "1px solid oklch(0.85 0.2 168 / 0.4)"
        : "1px solid transparent",
    color: activeTab === tab ? "oklch(0.85 0.2 168)" : "oklch(0.65 0.02 240)",
  });

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
          maxHeight: "88vh",
        }}
      >
        <SheetHeader className="px-4 pt-4 pb-2">
          {/* Handle bar */}
          <div className="flex justify-center mb-2">
            <div className="w-10 h-1 rounded-full bg-border/50" />
          </div>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.85 0.2 168 / 0.15)",
                border: "1px solid oklch(0.85 0.2 168 / 0.4)",
              }}
            >
              <User className="w-5 h-5 text-neon-green" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-bold text-foreground text-left">
                My Profile
              </SheetTitle>
              <p className="text-[11px] font-mono text-muted-foreground truncate">
                {shortPrincipal}
              </p>
            </div>
            <div className="text-right">
              <div
                className="text-xl font-black tabular-nums"
                style={{
                  color: "oklch(0.85 0.2 168)",
                  textShadow: "0 0 12px oklch(0.85 0.2 168 / 0.5)",
                }}
              >
                {formatCoins(coins)}
              </div>
              <div className="text-[10px] text-muted-foreground">coins</div>
            </div>
          </div>

          {Number(streak) > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full w-fit mt-1"
              style={{
                background: "oklch(0.57 0.28 300 / 0.15)",
                border: "1px solid oklch(0.57 0.28 300 / 0.4)",
              }}
            >
              <Flame className="w-3 h-3 text-neon-violet" />
              <span className="text-[10px] font-bold text-neon-violet">
                {Number(streak)} day streak
              </span>
            </div>
          )}
        </SheetHeader>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 py-2 border-b border-border/20">
          {(["wallet", "history", "withdraw"] as const).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-lg transition-all"
              style={tabStyle(tab)}
            >
              {tab === "wallet"
                ? "Wallet"
                : tab === "history"
                  ? "Transactions"
                  : "Withdraw"}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1" style={{ height: "calc(88vh - 160px)" }}>
          <div className="px-4 py-4">
            {/* WALLET TAB */}
            {activeTab === "wallet" && (
              <div className="space-y-4">
                {/* Coin balance */}
                <div
                  className="rounded-xl p-4 flex items-center justify-between"
                  style={{
                    background: "oklch(0.85 0.2 168 / 0.07)",
                    border: "1px solid oklch(0.85 0.2 168 / 0.2)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-neon-green" />
                    <span className="text-sm font-semibold text-foreground">
                      Balance
                    </span>
                  </div>
                  <div
                    className="text-2xl font-black tabular-nums"
                    style={{ color: "oklch(0.85 0.2 168)" }}
                  >
                    {formatCoins(coins)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      coins
                    </span>
                  </div>
                </div>

                {/* Daily bonus */}
                {bonusAvailable && (
                  <Button
                    onClick={handleClaimBonus}
                    disabled={claimBonus.isPending}
                    className="w-full text-xs font-bold"
                    style={{
                      background: "oklch(0.57 0.28 300 / 0.2)",
                      border: "1px solid oklch(0.57 0.28 300 / 0.5)",
                      color: "oklch(0.68 0.25 300)",
                    }}
                  >
                    {claimBonus.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <Gift className="w-3.5 h-3.5 mr-1" />
                    )}
                    Claim Daily Bonus 🎁
                  </Button>
                )}

                {/* Deposit flow */}
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: "oklch(0.11 0.02 240 / 0.8)",
                    border: "1px solid oklch(0.25 0.04 240 / 0.5)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowDownCircle className="w-4 h-4 text-neon-green" />
                    <span className="text-sm font-semibold text-foreground">
                      {depositStep === "enter"
                        ? "Deposit"
                        : depositStep === "pay"
                          ? "Pay via UPI"
                          : depositStep === "confirm"
                            ? "Confirm Payment"
                            : "Request Submitted"}
                    </span>
                  </div>

                  {depositStep === "enter" && (
                    <>
                      <div
                        className="rounded-lg p-2.5 text-xs flex items-start gap-2"
                        style={{
                          background: "oklch(0.57 0.28 300 / 0.1)",
                          border: "1px solid oklch(0.57 0.28 300 / 0.3)",
                        }}
                      >
                        <Gift
                          className="w-3.5 h-3.5 shrink-0 mt-0.5"
                          style={{ color: "oklch(0.68 0.25 300)" }}
                        />
                        <span style={{ color: "oklch(0.75 0.18 300)" }}>
                          Deposit ₹100+ and get <strong>100 bonus coins</strong>
                          !
                        </span>
                      </div>
                      <Input
                        type="number"
                        placeholder="Amount in ₹..."
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="bg-muted/30 border-border/40"
                      />
                      {isValidAmount && (
                        <div
                          className="text-xs text-center rounded-md p-2"
                          style={{ background: "oklch(0.2 0.05 168 / 0.4)" }}
                        >
                          You'll receive:{" "}
                          <span className="font-bold text-neon-green">
                            {coinsToCredit}
                            {qualifiesForBonus ? " + 100 bonus" : ""} coins
                          </span>{" "}
                          after approval
                        </div>
                      )}
                      <Button
                        onClick={() => setDepositStep("pay")}
                        disabled={!isValidAmount}
                        className="w-full btn-gradient text-background font-bold"
                      >
                        Next
                      </Button>
                    </>
                  )}

                  {depositStep === "pay" && (
                    <>
                      <div
                        className="text-xs text-center rounded-lg p-2.5"
                        style={{
                          background: "oklch(0.85 0.2 168 / 0.08)",
                          border: "1px solid oklch(0.85 0.2 168 / 0.3)",
                        }}
                      >
                        Pay exactly{" "}
                        <span className="font-black text-neon-green text-sm">
                          ₹{parsedAmount}
                        </span>{" "}
                        to the UPI below
                      </div>
                      <div className="flex justify-center">
                        <div
                          className="rounded-xl overflow-hidden p-2"
                          style={{
                            background: "white",
                            width: 160,
                            height: 160,
                          }}
                        >
                          <img
                            src={qrImageUrl}
                            alt="UPI QR"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-2 rounded-lg p-3"
                        style={{
                          background: "oklch(0.15 0.02 0 / 0.6)",
                          border: "1px solid oklch(0.3 0.05 0 / 0.5)",
                        }}
                      >
                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground mb-0.5">
                            UPI ID
                          </p>
                          <p className="text-sm font-mono font-bold text-foreground">
                            {upiId}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCopyUpi}
                          className="shrink-0 h-8 w-8 p-0"
                        >
                          {copied ? (
                            <CheckCircle2 className="w-4 h-4 text-neon-green" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setDepositStep("enter")}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={() => setDepositStep("confirm")}
                          className="flex-1 btn-gradient text-background font-bold"
                        >
                          I've Paid
                        </Button>
                      </div>
                    </>
                  )}

                  {depositStep === "confirm" && (
                    <>
                      <div className="text-center space-y-1">
                        <div className="text-3xl">✅</div>
                        <p className="text-xs text-muted-foreground">
                          Click submit to send your deposit request. Admin will
                          verify and credit coins.
                        </p>
                      </div>
                      {qualifiesForBonus && (
                        <div
                          className="rounded-lg p-2.5 text-xs text-center"
                          style={{
                            background: "oklch(0.57 0.28 300 / 0.1)",
                            border: "1px solid oklch(0.57 0.28 300 / 0.35)",
                          }}
                        >
                          <span style={{ color: "oklch(0.75 0.18 300)" }}>
                            🎁 +<strong>100 bonus coins</strong> for ₹100+
                            deposit
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setDepositStep("pay")}
                          className="flex-1"
                        >
                          Back
                        </Button>
                        <Button
                          onClick={handleSubmitDeposit}
                          disabled={submitDeposit.isPending}
                          className="flex-1 btn-gradient text-background font-bold"
                        >
                          {submitDeposit.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Submit"
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {depositStep === "submitted" && (
                    <div className="text-center space-y-3">
                      <div className="text-4xl">⏳</div>
                      <p className="text-sm font-bold text-foreground">
                        Request Submitted!
                      </p>
                      <div
                        className="flex items-center justify-center gap-2 rounded-lg p-2.5 text-xs"
                        style={{
                          background: "oklch(0.85 0.2 168 / 0.08)",
                          border: "1px solid oklch(0.85 0.2 168 / 0.3)",
                        }}
                      >
                        <Clock className="w-4 h-4 text-neon-green" />
                        <span className="text-neon-green font-semibold">
                          Pending admin approval
                        </span>
                      </div>
                      <Button
                        onClick={resetDeposit}
                        className="w-full btn-gradient text-background font-bold"
                      >
                        New Deposit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TRANSACTIONS TAB */}
            {activeTab === "history" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Your bet history ({betHistory.length} bets)
                </p>
                {betHistory.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground text-sm">
                      No bets placed yet
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Start playing to see your history here
                    </p>
                  </div>
                ) : (
                  [...betHistory].reverse().map((bet, i) => {
                    const colorHex =
                      bet.betColor === "red"
                        ? "oklch(0.60 0.22 25)"
                        : bet.betColor === "green"
                          ? "oklch(0.85 0.2 168)"
                          : "oklch(0.57 0.28 300)";
                    const betDate = new Date(Number(bet.betTime) / 1_000_000);
                    return (
                      <div
                        key={`bet-${i}-${String(bet.betTime)}`}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{
                          background: "oklch(0.11 0.02 240 / 0.8)",
                          border: "1px solid oklch(0.25 0.04 240 / 0.5)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              background: `${colorHex} / 0.15`,
                              border: `1px solid ${colorHex}`,
                            }}
                          >
                            <TrendingUp
                              className="w-4 h-4"
                              style={{ color: colorHex }}
                            />
                          </div>
                          <div>
                            <p
                              className="text-sm font-bold capitalize"
                              style={{ color: colorHex }}
                            >
                              {bet.betColor}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {betDate.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">
                            {formatCoins(bet.betAmount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            coins
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* WITHDRAW TAB */}
            {activeTab === "withdraw" && (
              <div className="space-y-4">
                {/* Request withdrawal */}
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: "oklch(0.11 0.02 240 / 0.8)",
                    border: "1px solid oklch(0.25 0.04 240 / 0.5)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle
                      className="w-4 h-4"
                      style={{ color: "oklch(0.60 0.22 25)" }}
                    />
                    <span className="text-sm font-semibold text-foreground">
                      Request Withdrawal
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Withdrawals are processed manually by admins.
                  </p>
                  <div
                    className="flex items-center justify-between rounded-lg p-3"
                    style={{
                      background: "oklch(0.85 0.2 168 / 0.07)",
                      border: "1px solid oklch(0.85 0.2 168 / 0.2)",
                    }}
                  >
                    <span className="text-xs text-muted-foreground">
                      Available balance
                    </span>
                    <span className="text-sm font-black text-neon-green">
                      {formatCoins(coins)} coins
                    </span>
                  </div>
                  <Input
                    type="number"
                    placeholder="Amount to withdraw..."
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-muted/30 border-border/40"
                  />
                  <Button
                    onClick={handleWithdraw}
                    disabled={withdraw.isPending}
                    className="w-full font-bold"
                    style={{
                      background: "oklch(0.60 0.22 25)",
                      color: "white",
                    }}
                  >
                    {withdraw.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Request Withdrawal"
                    )}
                  </Button>
                </div>

                {/* Withdrawal history */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Past requests ({withdrawalRequests.length})
                  </p>
                  {withdrawalRequests.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground text-sm">
                        No withdrawal requests yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...withdrawalRequests].reverse().map((req, i) => {
                        const reqDate = new Date(
                          Number(req.requestTime) / 1_000_000,
                        );
                        return (
                          <div
                            key={`wr-${i}-${String(req.requestTime)}`}
                            className="flex items-center justify-between p-3 rounded-xl"
                            style={{
                              background: "oklch(0.11 0.02 240 / 0.8)",
                              border: "1px solid oklch(0.25 0.04 240 / 0.5)",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                style={{
                                  background: req.processed
                                    ? "oklch(0.85 0.2 168 / 0.1)"
                                    : "oklch(0.60 0.22 25 / 0.1)",
                                  border: `1px solid ${req.processed ? "oklch(0.85 0.2 168 / 0.4)" : "oklch(0.60 0.22 25 / 0.4)"}`,
                                }}
                              >
                                <TrendingDown
                                  className="w-4 h-4"
                                  style={{
                                    color: req.processed
                                      ? "oklch(0.85 0.2 168)"
                                      : "oklch(0.60 0.22 25)",
                                  }}
                                />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {reqDate.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground">
                                {formatCoins(req.amount)}
                              </span>
                              <Badge
                                className="text-[10px]"
                                style={{
                                  background: req.processed
                                    ? "oklch(0.85 0.2 168 / 0.15)"
                                    : "oklch(0.60 0.22 25 / 0.15)",
                                  border: `1px solid ${req.processed ? "oklch(0.85 0.2 168 / 0.4)" : "oklch(0.60 0.22 25 / 0.4)"}`,
                                  color: req.processed
                                    ? "oklch(0.85 0.2 168)"
                                    : "oklch(0.70 0.18 25)",
                                }}
                              >
                                {req.processed ? "Done" : "Pending"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

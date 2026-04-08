import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Flame,
  Gift,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useClaimBonus,
  useHasFirstDepositBonus,
  usePaymentMethod,
  useRequestWithdrawal,
  useSubmitDepositRequest,
} from "../hooks/useQueries";
import type { UserProfile } from "../types";
import { canClaimBonus, formatCoins } from "../utils/gameUtils";

interface WalletPanelProps {
  profile: UserProfile | null;
}

// Build UPI deep link for a payment app
function buildUpiDeepLink(
  app: "gpay" | "phonepe" | "bhim" | "paytm",
  upiId: string,
  amount: number,
  note: string,
): string {
  const base = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=AVPlay&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  // Each app uses its own scheme for direct open
  switch (app) {
    case "gpay":
      return `gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=AVPlay&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    case "phonepe":
      return `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=AVPlay&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    case "bhim":
      return `bhim://pay?pa=${encodeURIComponent(upiId)}&pn=AVPlay&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    case "paytm":
      return `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=AVPlay&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
    default:
      return base;
  }
}

const PAYMENT_APPS = [
  {
    id: "gpay" as const,
    label: "Google Pay",
    shortLabel: "GPay",
    color: "#4285F4",
    bgColor: "rgba(66,133,244,0.12)",
    borderColor: "rgba(66,133,244,0.4)",
    emoji: "🔵",
  },
  {
    id: "phonepe" as const,
    label: "PhonePe",
    shortLabel: "PhonePe",
    color: "#5f259f",
    bgColor: "rgba(95,37,159,0.12)",
    borderColor: "rgba(95,37,159,0.4)",
    emoji: "💜",
  },
  {
    id: "bhim" as const,
    label: "BHIM UPI",
    shortLabel: "BHIM",
    color: "#1E7E34",
    bgColor: "rgba(30,126,52,0.12)",
    borderColor: "rgba(30,126,52,0.4)",
    emoji: "🟢",
  },
  {
    id: "paytm" as const,
    label: "Paytm",
    shortLabel: "Paytm",
    color: "#00BAF2",
    bgColor: "rgba(0,186,242,0.12)",
    borderColor: "rgba(0,186,242,0.4)",
    emoji: "🩵",
  },
];

export function WalletPanel({ profile }: WalletPanelProps) {
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositStep, setDepositStep] = useState<
    "enter" | "pay" | "confirm" | "submitted"
  >("enter");
  const [copied, setCopied] = useState(false);
  const submitDeposit = useSubmitDepositRequest();
  const withdraw = useRequestWithdrawal();
  const claimBonus = useClaimBonus();
  const paymentMethod = usePaymentMethod();
  const { data: hasReceivedBonus } = useHasFirstDepositBonus();

  const upiId = paymentMethod.data?.upiId ?? "6205006521@okbizaxis";
  const qrImageUrl =
    paymentMethod.data?.qrImageUrl ??
    "/assets/fd4426e3-53eb-407e-a99a-c7978d669943_image-019d4ab9-3854-716b-93ac-e620b7e024db.png";

  const coins = profile?.coins ?? 0n;
  const streak = profile?.dailyStreak ?? 0n;
  const bonusAvailable = profile ? canClaimBonus(profile.lastBonusTime) : false;

  const parsedAmount = Number.parseInt(depositAmount, 10);
  const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  // Bonus only applies on the first deposit of ₹100+
  const qualifiesForBonus =
    isValidAmount && parsedAmount >= 100 && !hasReceivedBonus;
  const coinsToCredit = isValidAmount ? parsedAmount : 0;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayWithApp = (appId: "gpay" | "phonepe" | "bhim" | "paytm") => {
    const link = buildUpiDeepLink(
      appId,
      upiId,
      parsedAmount,
      `AVPlay deposit ${parsedAmount}`,
    );
    window.location.href = link;
  };

  const handleSubmitDeposit = async () => {
    const amt = parsedAmount;
    try {
      await submitDeposit.mutateAsync(BigInt(amt));
      setDepositStep("submitted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit deposit request");
    }
  };

  const handleDepositClose = (open: boolean) => {
    setDepositOpen(open);
    if (!open) {
      setDepositStep("enter");
      setDepositAmount("");
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
      setWithdrawOpen(false);
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

  return (
    <div
      className="card-surface rounded-xl p-4 space-y-3"
      data-ocid="wallet.panel"
    >
      {/* Balance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="animate-coin-float">
            <Coins className="w-5 h-5 text-neon-green" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Balance
          </span>
        </div>
        {Number(streak) > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{
              background: "oklch(0.57 0.28 300 / 0.15)",
              border: "1px solid oklch(0.57 0.28 300 / 0.4)",
            }}
          >
            <Flame className="w-3 h-3 text-neon-violet" />
            <span className="text-[10px] font-bold text-neon-violet">
              {Number(streak)}d streak
            </span>
          </div>
        )}
      </div>

      <div
        className="text-3xl font-black text-neon-green tabular-nums animate-count-up"
        style={{ textShadow: "0 0 16px oklch(0.85 0.2 168 / 0.6)" }}
        data-ocid="wallet.balance.card"
      >
        {formatCoins(coins)}
        <span className="text-sm font-normal text-muted-foreground ml-1">
          coins
        </span>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        {/* DEPOSIT MODAL */}
        <Dialog open={depositOpen} onOpenChange={handleDepositClose}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              data-ocid="wallet.deposit.open_modal_button"
              className="flex-1 text-xs btn-gradient text-background font-bold"
            >
              <ArrowDownCircle className="w-3.5 h-3.5 mr-1" /> Deposit
            </Button>
          </DialogTrigger>
          <DialogContent
            className="bg-card border-border/50 max-w-sm"
            data-ocid="wallet.deposit.dialog"
          >
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {depositStep === "enter"
                  ? "Deposit Coins"
                  : depositStep === "pay"
                    ? "Pay via UPI"
                    : depositStep === "confirm"
                      ? "Confirm Payment"
                      : "Request Submitted"}
              </DialogTitle>
            </DialogHeader>

            {/* STEP 1: Enter amount */}
            {depositStep === "enter" && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Enter the amount in rupees (₹) you want to deposit. 1 rupee =
                  1 coin.
                </p>

                {/* Bonus callout — only shown if not yet received */}
                {!hasReceivedBonus && (
                  <div
                    className="rounded-lg p-3 text-xs flex items-start gap-2"
                    style={{
                      background: "oklch(0.57 0.28 300 / 0.1)",
                      border: "1px solid oklch(0.57 0.28 300 / 0.35)",
                    }}
                  >
                    <Gift
                      className="w-4 h-4 shrink-0 mt-0.5"
                      style={{ color: "oklch(0.68 0.25 300)" }}
                    />
                    <span style={{ color: "oklch(0.75 0.18 300)" }}>
                      <strong>First deposit of ₹100 or more</strong> gets a{" "}
                      <strong>100 bonus coins</strong> — one time only!
                    </span>
                  </div>
                )}

                <Input
                  type="number"
                  placeholder="Amount in ₹..."
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  data-ocid="wallet.deposit.input"
                  className="bg-muted/30 border-border/40"
                />

                {isValidAmount && (
                  <div
                    className="text-xs text-center rounded-md p-2"
                    style={{ background: "oklch(0.2 0.05 168 / 0.4)" }}
                  >
                    You will receive:{" "}
                    <span className="font-bold text-neon-green">
                      {coinsToCredit}
                      {qualifiesForBonus ? " + 100 bonus" : ""} coins
                    </span>{" "}
                    after admin approval
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDepositClose(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setDepositStep("pay")}
                    disabled={!isValidAmount}
                    className="flex-1 btn-gradient text-background font-bold"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Show QR / UPI + payment app buttons */}
            {depositStep === "pay" && (
              <div className="space-y-3 pt-2">
                <div
                  className="rounded-lg p-3 text-xs text-center"
                  style={{
                    background: "oklch(0.85 0.2 168 / 0.08)",
                    border: "1px solid oklch(0.85 0.2 168 / 0.3)",
                  }}
                >
                  Pay exactly{" "}
                  <span className="font-black text-neon-green text-sm">
                    ₹{parsedAmount}
                  </span>{" "}
                  to the UPI ID below
                </div>

                {/* Payment App Buttons */}
                <div>
                  <p className="text-[10px] text-muted-foreground mb-2 text-center uppercase tracking-wider font-semibold">
                    Pay directly with
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_APPS.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handlePayWithApp(app.id)}
                        className="flex items-center justify-center gap-2 rounded-lg p-2.5 text-xs font-bold transition-all active:scale-95"
                        style={{
                          background: app.bgColor,
                          border: `1px solid ${app.borderColor}`,
                          color: app.color,
                        }}
                      >
                        <span className="text-base leading-none">
                          {app.emoji}
                        </span>
                        <span>{app.label}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 h-px"
                    style={{ background: "oklch(0.3 0.03 0 / 0.6)" }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    or scan QR
                  </span>
                  <div
                    className="flex-1 h-px"
                    style={{ background: "oklch(0.3 0.03 0 / 0.6)" }}
                  />
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div
                    className="rounded-xl overflow-hidden p-2"
                    style={{ background: "white", width: 160, height: 160 }}
                  >
                    <img
                      src={qrImageUrl}
                      alt="UPI QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* UPI ID */}
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
              </div>
            )}

            {/* STEP 3: Confirm */}
            {depositStep === "confirm" && (
              <div className="space-y-4 pt-2">
                <div className="text-center space-y-2">
                  <div className="text-4xl">✅</div>
                  <p className="text-sm font-semibold text-foreground">
                    Confirm your payment
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click below to submit your deposit request. Admin will
                    verify your payment and credit your coins.
                  </p>
                </div>

                {qualifiesForBonus && (
                  <div
                    className="rounded-lg p-3 text-xs text-center"
                    style={{
                      background: "oklch(0.57 0.28 300 / 0.1)",
                      border: "1px solid oklch(0.57 0.28 300 / 0.35)",
                    }}
                  >
                    <span style={{ color: "oklch(0.75 0.18 300)" }}>
                      🎁 You'll also receive <strong>100 bonus coins</strong>{" "}
                      (first deposit bonus!)
                    </span>
                  </div>
                )}

                <div
                  className="rounded-lg p-3 text-sm text-center font-bold"
                  style={{
                    background: "oklch(0.2 0.05 168 / 0.4)",
                    border: "1px solid oklch(0.85 0.2 168 / 0.3)",
                  }}
                >
                  Total coins (after approval):{" "}
                  <span className="text-neon-green">
                    {coinsToCredit + (qualifiesForBonus ? 100 : 0)}
                  </span>
                </div>

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
                    data-ocid="wallet.deposit.submit_button"
                    className="flex-1 btn-gradient text-background font-bold"
                  >
                    {submitDeposit.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4: Submitted */}
            {depositStep === "submitted" && (
              <div className="space-y-4 pt-2 text-center">
                <div className="text-5xl">⏳</div>
                <p className="text-base font-bold text-foreground">
                  Request Submitted!
                </p>
                <p className="text-xs text-muted-foreground">
                  Your deposit request for{" "}
                  <span className="font-bold text-neon-green">
                    ₹{parsedAmount}
                  </span>{" "}
                  has been sent. Admin will verify and credit your coins
                  shortly.
                </p>
                <div
                  className="flex items-center justify-center gap-2 rounded-lg p-3 text-xs"
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
                  onClick={() => handleDepositClose(false)}
                  className="w-full btn-gradient text-background font-bold"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              data-ocid="wallet.withdraw.open_modal_button"
              className="flex-1 text-xs border-border/50 text-foreground"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 mr-1" /> Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent
            className="bg-card border-border/50 max-w-sm"
            data-ocid="wallet.withdraw.dialog"
          >
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Request Withdrawal
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Withdrawal requests are processed by admins.
              </p>
              <Input
                type="number"
                placeholder="Amount..."
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                data-ocid="wallet.withdraw.input"
                className="bg-muted/30 border-border/40"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setWithdrawOpen(false)}
                  data-ocid="wallet.withdraw.cancel_button"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={withdraw.isPending}
                  data-ocid="wallet.withdraw.submit_button"
                  className="flex-1 font-bold"
                  style={{ background: "oklch(0.60 0.22 25)", color: "white" }}
                >
                  {withdraw.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Request"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Daily bonus */}
      {bonusAvailable && (
        <Button
          onClick={handleClaimBonus}
          disabled={claimBonus.isPending}
          data-ocid="wallet.bonus.button"
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
    </div>
  );
}

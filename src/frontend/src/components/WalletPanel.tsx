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
  Coins,
  Copy,
  Flame,
  Gift,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import {
  useClaimBonus,
  useDepositCoins,
  useRequestWithdrawal,
} from "../hooks/useQueries";
import { canClaimBonus, formatCoins } from "../utils/gameUtils";

const UPI_ID = "6205006521@okbizaxis";
const QR_IMAGE =
  "/assets/fd4426e3-53eb-407e-a99a-c7978d669943_image-019d4ab9-3854-716b-93ac-e620b7e024db.png";

interface WalletPanelProps {
  profile: UserProfile | null;
}

export function WalletPanel({ profile }: WalletPanelProps) {
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositStep, setDepositStep] = useState<"enter" | "pay" | "confirm">(
    "enter",
  );
  const [copied, setCopied] = useState(false);
  const deposit = useDepositCoins();
  const withdraw = useRequestWithdrawal();
  const claimBonus = useClaimBonus();

  const coins = profile?.coins ?? 0n;
  const streak = profile?.dailyStreak ?? 0n;
  const bonusAvailable = profile ? canClaimBonus(profile.lastBonusTime) : false;

  const parsedAmount = Number.parseInt(depositAmount, 10);
  const isValidAmount = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const qualifiesForBonus = isValidAmount && parsedAmount >= 100;
  const coinsToCredit = isValidAmount ? parsedAmount : 0;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmDeposit = async () => {
    const amt = parsedAmount;
    try {
      const totalCoins = qualifiesForBonus ? BigInt(amt + 100) : BigInt(amt);
      await deposit.mutateAsync(totalCoins);
      toast.success(
        qualifiesForBonus
          ? `${amt} coins + 100 bonus coins added!`
          : `${amt} coins added to your balance!`,
      );
      setDepositAmount("");
      setDepositStep("enter");
      setDepositOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Deposit failed");
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
                    : "Confirm Payment"}
              </DialogTitle>
            </DialogHeader>

            {/* STEP 1: Enter amount */}
            {depositStep === "enter" && (
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">
                  Enter the amount in rupees (₹) you want to deposit. 1 rupee =
                  1 coin.
                </p>

                {/* Bonus callout */}
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
                    <strong>Deposit ₹100 or more</strong> and get a{" "}
                    <strong>100 bonus coins</strong> added instantly!
                  </span>
                </div>

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
                    </span>
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

            {/* STEP 2: Show QR / UPI */}
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

                {/* QR Code */}
                <div className="flex justify-center">
                  <div
                    className="rounded-xl overflow-hidden p-2"
                    style={{ background: "white", width: 180, height: 180 }}
                  >
                    <img
                      src={QR_IMAGE}
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
                      {UPI_ID}
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

                <p className="text-[11px] text-muted-foreground text-center">
                  Use Google Pay, PhonePe, Paytm, or any UPI app to scan &amp;
                  pay
                </p>

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
                    Once you confirm, your coins will be credited. Make sure you
                    have completed the UPI payment of{" "}
                    <span className="font-bold text-neon-green">
                      ₹{parsedAmount}
                    </span>
                    .
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
                      for depositing ₹100+
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
                  Total coins:{" "}
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
                    onClick={handleConfirmDeposit}
                    disabled={deposit.isPending}
                    data-ocid="wallet.deposit.submit_button"
                    className="flex-1 btn-gradient text-background font-bold"
                  >
                    {deposit.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Confirm & Credit"
                    )}
                  </Button>
                </div>
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

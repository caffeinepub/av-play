// Application-level types used by UI components
// These supplement the auto-generated backend.d.ts which may not include them

export interface WithdrawalRequest {
  amount: bigint;
  requestTime: bigint;
  processed: boolean;
  accountDetails?: string;
}

export interface UserProfile {
  coins: bigint;
  dailyStreak: bigint;
  lastBonusTime: bigint;
  lastSpinTime?: bigint;
  withdrawalRequests: WithdrawalRequest[];
  totalDeposit?: bigint;
  depositStatus?: string;
}

export enum UserRole {
  guest = "guest",
  user = "user",
  admin = "admin",
  super_admin = "super_admin",
}

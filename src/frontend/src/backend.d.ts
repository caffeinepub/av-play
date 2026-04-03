import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface RoundView {
    startTime: Time;
    result?: string;
    bets: Array<[Principal, Bet]>;
    totalRedBets: bigint;
    totalGreenBets: bigint;
    roundId: bigint;
    totalVioletBets: bigint;
    phase: GamePhase;
}
export interface Bet {
    betAmount: bigint;
    betTime: Time;
    betColor: string;
}
export type GamePhase = {
    __kind__: "reveal";
    reveal: {
        startTime: Time;
        result?: string;
    };
} | {
    __kind__: "betting";
    betting: {
        startTime: Time;
    };
} | {
    __kind__: "cooldown";
    cooldown: {
        startTime: Time;
    };
};
export interface WithdrawalRequest {
    processed: boolean;
    amount: bigint;
    requestTime: Time;
}
export interface MultiplierConfig {
    red: number;
    green: number;
    violet: number;
}
export interface UserProfile {
    coins: bigint;
    withdrawalRequests: Array<WithdrawalRequest>;
    lastBonusTime: Time;
    dailyStreak: bigint;
    betHistory: Array<Bet>;
    lastSpinTime: Time;
}
export interface DepositRequest {
    user: Principal;
    amount: bigint;
    bonusAmount: bigint;
    requestTime: Time;
    approved: boolean;
    index: bigint;
}
export interface PaymentMethod {
    upiId: string;
    qrImageUrl: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    _initializeAccessControlWithSecret(secret: string): Promise<void>;
    adjustUserCoins(user: Principal, amount: bigint): Promise<void>;
    approveDeposit(requestIndex: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    claimDailyBonus(): Promise<void>;
    clearManualOverride(): Promise<void>;
    depositCoins(amount: bigint): Promise<void>;
    getAdminLogs(): Promise<Array<string>>;
    getAllDepositRequests(): Promise<Array<DepositRequest>>;
    getAllUserHoldings(): Promise<Array<[Principal, bigint]>>;
    getAllWithdrawalRequests(): Promise<Array<[Principal, WithdrawalRequest]>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentRoundBets(): Promise<{
        red: bigint;
        green: bigint;
        violet: bigint;
    }>;
    getCurrentRoundPhase(): Promise<string>;
    getGameState(): Promise<{
        roundHistory: Array<RoundView>;
        autoResolve: boolean;
        manualResult?: string;
        currentRoundId: bigint;
        phase: string;
        multipliers: MultiplierConfig;
        phaseStartTimestamp: Time;
    }>;
    getPaymentMethod(): Promise<PaymentMethod>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasFirstDepositBonus(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    markWithdrawalProcessed(user: Principal, index: bigint): Promise<void>;
    placeBet(color: string, amount: bigint): Promise<void>;
    requestWithdrawal(amount: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setManualResultOverride(result: string): Promise<void>;
    setMultipliers(red: number, green: number, violet: number): Promise<void>;
    setPaymentMethod(upiId: string, qrImageUrl: string): Promise<void>;
    submitDepositRequest(amount: bigint): Promise<void>;
    spinWheel(): Promise<bigint>;
    toggleAutoResolve(): Promise<void>;
}

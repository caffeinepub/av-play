import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRole } from "../backend.d";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export function useGameState() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["gameState"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getGameState();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 2000,
    staleTime: 1000,
  });
}

export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerUserProfile();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useUserRole() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      if (!actor) return UserRole.guest;
      try {
        return await actor.getCallerUserRole();
      } catch {
        return UserRole.guest;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePaymentMethod() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["paymentMethod"],
    queryFn: async () => {
      if (!actor)
        return {
          upiId: "6205006521@okbizaxis",
          qrImageUrl:
            "/assets/fd4426e3-53eb-407e-a99a-c7978d669943_image-019d4ab9-3854-716b-93ac-e620b7e024db.png",
        };
      try {
        return await actor.getPaymentMethod();
      } catch {
        return {
          upiId: "6205006521@okbizaxis",
          qrImageUrl:
            "/assets/fd4426e3-53eb-407e-a99a-c7978d669943_image-019d4ab9-3854-716b-93ac-e620b7e024db.png",
        };
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePlaceBet() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      color,
      amount,
    }: { color: string; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.placeBet(color, amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
      qc.invalidateQueries({ queryKey: ["gameState"] });
    },
  });
}

export function useClaimBonus() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.claimDailyBonus();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useSubmitDepositRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitDepositRequest(amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useDepositCoins() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.depositCoins(amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useRequestWithdrawal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.requestWithdrawal(amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

// Admin queries
export function useAllUserHoldings() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["allUserHoldings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUserHoldings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAdminLogs() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["adminLogs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAdminLogs();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useAllWithdrawalRequests() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["withdrawalRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllWithdrawalRequests();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useAllDepositRequests() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["depositRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDepositRequests();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useApproveDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestIndex: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.approveDeposit(requestIndex);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["depositRequests"] });
      qc.invalidateQueries({ queryKey: ["allUserHoldings"] });
    },
  });
}

export function useSetPaymentMethod() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      upiId,
      qrImageUrl,
    }: { upiId: string; qrImageUrl: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.setPaymentMethod(upiId, qrImageUrl);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paymentMethod"] });
    },
  });
}

export function useToggleAutoResolve() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.toggleAutoResolve();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gameState"] }),
  });
}

export function useSetManualResult() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (result: string) => {
      if (!actor) throw new Error("Not connected");
      return actor.setManualResultOverride(result);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gameState"] }),
  });
}

export function useClearManualOverride() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.clearManualOverride();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gameState"] }),
  });
}

export function useSetMultipliers() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      red,
      green,
      violet,
    }: { red: number; green: number; violet: number }) => {
      if (!actor) throw new Error("Not connected");
      return actor.setMultipliers(red, green, violet);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gameState"] }),
  });
}

export function useAdjustUserCoins() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      amount,
    }: { user: Principal; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.adjustUserCoins(user, amount);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allUserHoldings"] }),
  });
}

export function useSetUserCoins() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      user,
      amount,
    }: { user: Principal; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).setUserCoins(user, amount);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["allUserHoldings"] }),
  });
}

export function useSpinWheel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<bigint> => {
      if (!actor) throw new Error("Not connected");
      return actor.spinWheel();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}
export function useMarkWithdrawalProcessed() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, index }: { user: Principal; index: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return actor.markWithdrawalProcessed(user, index);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["withdrawalRequests"] }),
  });
}

export function useCallerDepositRequests() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  return useQuery({
    queryKey: ["callerDepositRequests", identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      try {
        const all = await actor.getAllDepositRequests();
        const callerPrincipal = identity.getPrincipal().toString();
        return all.filter((r) => r.user.toString() === callerPrincipal);
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 5000,
  });
}

export function useCallerWithdrawalRequests() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerWithdrawalRequests"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const profile = await actor.getCallerUserProfile();
        return profile?.withdrawalRequests ?? [];
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useHasFirstDepositBonus() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["hasFirstDepositBonus"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.hasFirstDepositBonus();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCurrentRoundBets() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["currentRoundBets"],
    queryFn: async () => {
      if (!actor) return { red: 0n, green: 0n, violet: 0n };
      try {
        return await actor.getCurrentRoundBets();
      } catch {
        return { red: 0n, green: 0n, violet: 0n };
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 2000,
  });
}

// ─── New hooks for super admin features ───────────────────────────────────────

export function useCallerAdminRole() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerAdminRole"],
    queryFn: async () => {
      if (!actor) return "user";
      try {
        return await (actor as any).getCallerAdminRole();
      } catch {
        return "user";
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useForceResultStatus() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["forceResultStatus"],
    queryFn: async () => {
      if (!actor)
        return { forcedColor: null, forcedSize: null, isActive: false };
      try {
        return await (actor as any).getForceResultStatus();
      } catch {
        return { forcedColor: null, forcedSize: null, isActive: false };
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 3000,
  });
}

export function useForceResult() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ color, size }: { color: string; size: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).forceResult(color, size);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forceResultStatus"] });
      qc.invalidateQueries({ queryKey: ["gameState"] });
    },
  });
}

export function useClearForcedResult() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).clearForcedResult();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forceResultStatus"] });
      qc.invalidateQueries({ queryKey: ["gameState"] });
    },
  });
}

export function useAdminBalance(adminPrincipal: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["adminBalance", adminPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !adminPrincipal) return 0n;
      try {
        return await (actor as any).getAdminBalance(adminPrincipal);
      } catch {
        return 0n;
      }
    },
    enabled: !!actor && !isFetching && !!adminPrincipal,
    refetchInterval: 5000,
  });
}

export function useAssignCoinsToAdmin() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      admin,
      amount,
    }: { admin: Principal; amount: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).assignCoinsToAdmin(admin, amount);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminBalance"] });
    },
  });
}

export function useAssignAdminRole() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).assignAdminRole(user, role);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["callerAdminRole"] });
    },
  });
}

export function useTransactionLogs() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["transactionLogs"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await (actor as any).getTransactionLogs();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useHasApprovedDeposit() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["hasApprovedDeposit"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await (actor as any).hasApprovedDeposit();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useMyAdminBalance() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myAdminBalance"],
    queryFn: async () => {
      if (!actor) return 0n;
      try {
        return await (actor as any).getMyAdminBalance();
      } catch {
        return 0n;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

export function useSetSuperAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      principal: import("@icp-sdk/core/principal").Principal,
    ) => {
      if (!actor) throw new Error("Not connected");
      return await (actor as any).setSuperAdmin(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superAdminPrincipal"] });
      queryClient.invalidateQueries({ queryKey: ["callerAdminRole"] });
    },
  });
}

export function useGetSuperAdminPrincipal() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["superAdminPrincipal"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const result = await (actor as any).getSuperAdminPrincipal();
        // Returns ?Principal (optional) — unwrap
        if (Array.isArray(result) && result.length > 0) return result[0];
        return result ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

export function useCallerApprovedDepositTotal() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerApprovedDepositTotal"],
    queryFn: async () => {
      if (!actor) return 0;
      try {
        const result = await (actor as any).getCallerApprovedDepositTotal();
        return Number(result ?? 0);
      } catch {
        return 0;
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000,
  });
}

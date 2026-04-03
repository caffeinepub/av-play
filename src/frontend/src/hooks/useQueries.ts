import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRole } from "../backend.d";
import { useActor } from "./useActor";

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

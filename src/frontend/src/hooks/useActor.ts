// Local wrapper around @caffeineai/core-infrastructure useActor
// Wires the generated createActor from backend.ts into the hook

import { useActor as useCoreActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyActor = any;

export function useActor(): { actor: AnyActor | null; isFetching: boolean } {
  // Cast to any so callers can invoke all backend methods regardless of generated type stubs
  const result = useCoreActor(createActor);
  return {
    actor: result.actor as AnyActor | null,
    isFetching: result.isFetching,
  };
}

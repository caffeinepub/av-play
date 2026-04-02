# AV Play

## Current State
The app is a real-time color trading game on ICP. The Activity section (ActivitySheet.tsx) currently shows a 7-day attendance grid with daily bonus claiming. The backend tracks user coins, bets, deposits/withdrawals, and daily streaks.

## Requested Changes (Diff)

### Add
- **Spin Wheel** in the Activity section (below the attendance grid):
  - 6 prize segments on wheel: 9, 19, 29, 129, 499, 999 coins
  - Only 9, 19, 29 can actually be won (weighted probability)
  - 129, 499, 999 are "ghost" slots — wheel can land on them visually but logic always picks from 9/19/29
  - Eligibility: user must have deposited at least ₹500 (tracked via a backend flag `hasDeposited500`)
  - Animated spin: CSS/JS rotation animation when user taps spin button
  - On win: coins automatically credited to user balance
  - Spin is free but limited (once per day, tracked via backend `lastSpinTime`)
- **Backend**: Add `spinWheel()` function that:
  - Requires login
  - Checks `lastSpinTime` (24h cooldown)
  - Returns one of [9, 19, 29] randomly
  - Credits that amount to user coins
  - Updates `lastSpinTime`
  - Returns the won amount
- **Backend UserProfile**: Add `lastSpinTime: Time` field
- **Frontend query hook**: `useSpinWheel` mutation
- **SpinWheel.tsx**: New animated component integrated into ActivitySheet

### Modify
- `src/backend/main.mo`: Add `lastSpinTime` to `User` and `UserProfile` types; add `spinWheel()` function
- `src/frontend/src/backend.d.ts`: Add `lastSpinTime` to `UserProfile`; add `spinWheel(): Promise<bigint>` to interface
- `src/frontend/src/declarations/backend.did.js`: Add `spinWheel` to IDL service and idlService/idlFactory
- `src/frontend/src/hooks/useQueries.ts`: Add `useSpinWheel` mutation
- `src/frontend/src/components/ActivitySheet.tsx`: Add SpinWheel section below the attendance grid

### Remove
- Nothing removed

## Implementation Plan
1. Update Motoko backend: add `lastSpinTime` field to User/UserProfile, implement `spinWheel()` with 24h cooldown, random win from [9,19,29], coin crediting
2. Update backend.d.ts: add `lastSpinTime` to UserProfile, add `spinWheel()` to backendInterface
3. Update backend.did.js: add `spinWheel` Func to all three IDL locations (idlService, idlFactory return, and idlFactory inline)
4. Add `useSpinWheel` hook to useQueries.ts
5. Create SpinWheel.tsx component with 6-segment visual wheel, CSS spin animation, prize display
6. Integrate SpinWheel into ActivitySheet.tsx
7. Validate and deploy

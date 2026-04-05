# AV Play

## Current State
- Admin panel has role badges and admin balance display in header
- `setSuperAdmin` backend function exists (one-time or super-admin-only call)
- `getSuperAdminPrincipal` backend query exists
- `hasApprovedDeposit` backend query exists (returns bool: approved total >= 100)
- `userApprovedDepositTotal` map exists in backend and is updated in `approveDeposit`
- BetPanel shows "Deposit Required" gate based on `hasApprovedDeposit` boolean prop
- TradingPage passes `hasApprovedDeposit.data ?? false` as boolean to BetPanel/ColorCard
- No "Set Super Admin" button exists in the Admin UI
- No Principal ID display in admin header
- No `useSetSuperAdmin` or `useGetSuperAdminPrincipal` hooks in useQueries
- No `getUserApprovedDepositTotal` query exposed in backend

## Requested Changes (Diff)

### Add
- "Set Super Admin" button at top of Admin Panel (visible only when no super admin is set yet)
- Display current user's Principal ID in admin panel header
- `useSetSuperAdmin` mutation hook in useQueries
- `useGetSuperAdminPrincipal` query hook in useQueries  
- `getUserApprovedDepositTotal` backend query (returns Nat for caller's approved deposit total)
- Debug console.log in BetPanel/TradingPage: `console.log(user.total_deposit, deposit_status)`

### Modify
- Admin panel header: add Principal ID display
- Betting unlock condition: change from `!hasApprovedDeposit` (bool) to `user.total_deposit < 100` check using approved deposit total
- BetPanel: use totalDeposit >= 100 as the condition (not just a boolean)
- TradingPage: fetch approved deposit total and pass to BetPanel; add debug log after fetch
- `approveDeposit` backend: already tracks `userApprovedDepositTotal` correctly - verify it adds to total_deposit and marks approved status

### Remove
- Nothing removed

## Implementation Plan
1. Add `getUserApprovedDepositTotal` query to backend (returns caller's approved deposit total as Nat)
2. Add `useSetSuperAdmin` mutation and `useGetSuperAdminPrincipal` / `useGetCallerApprovedDepositTotal` hooks to useQueries.ts
3. Update AdminPage:
   - Show caller's Principal ID in header
   - Show "Set Super Admin" button at top of panel (above tabs) when `superAdminPrincipal` is null
   - On click: call `setSuperAdmin(callerPrincipal)`, then show success message and hide button
4. Update BetPanel:
   - Change prop from `hasApprovedDeposit: boolean` to `totalDeposit: number`
   - Show "Deposit Required" when totalDeposit < 100
   - Add debug console.log
5. Update TradingPage:
   - Use `useGetCallerApprovedDepositTotal` instead of `useHasApprovedDeposit`
   - Pass `totalDeposit` (number) to BetPanel/ColorCard
   - Add debug log: console.log(totalDeposit, depositStatus)

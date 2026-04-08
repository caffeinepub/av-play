import Map "mo:core/Map";
import Array "mo:core/Array";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Float "mo:core/Float";
import Migration "migration";

(with migration = Migration.run)
actor {
  // CONSTANTS
  let startingCoins = 100;
  let betLimit = 100_000; // kept for upgrade compatibility
  let roundTimeSeconds = 60;
  let betPhaseSeconds = 50;
  let dailyBonusCooldown = 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds
  let MIN_DEPOSIT_TO_BET : Nat = 100; // minimum approved deposit to unlock betting

  // Types
  public type UserProfile = {
    coins : Nat;
    lastBonusTime : Time.Time;
    betHistory : [Bet];
    withdrawalRequests : [WithdrawalRequest];
    dailyStreak : Nat;
    lastSpinTime : Time.Time;
  };

  type WithdrawalRequest = {
    amount : Nat;
    requestTime : Time.Time;
    processed : Bool;
  };

  type Bet = {
    betColor : Text;
    betAmount : Nat;
    betTime : Time.Time;
  };

  type GamePhase = {
    #betting : { startTime : Time.Time };
    #reveal : { startTime : Time.Time; result : ?Text };
    #cooldown : { startTime : Time.Time };
  };

  type Round = {
    roundId : Nat;
    phase : GamePhase;
    result : ?Text;
    bets : Map.Map<Principal, Bet>;
    totalRedBets : Nat;
    totalGreenBets : Nat;
    totalVioletBets : Nat;
    startTime : Time.Time;
  };

  type RoundView = {
    roundId : Nat;
    phase : GamePhase;
    result : ?Text;
    bets : [(Principal, Bet)];
    totalRedBets : Nat;
    totalGreenBets : Nat;
    totalVioletBets : Nat;
    startTime : Time.Time;
  };

  public type DepositRequest = {
    user : Principal;
    amount : Nat;
    bonusAmount : Nat;
    requestTime : Time.Time;
    approved : Bool;
    index : Nat;
  };

  public type PaymentMethod = {
    upiId : Text;
    qrImageUrl : Text;
  };

  public type AdminRole = {
    #super_admin;
    #admin;
    #user;
  };

  public type TransactionLog = {
    userId : Principal;
    adminId : Principal;
    amount : Int;
    logType : Text; // "deposit", "withdrawal", "adjust", "admin_assign"
    timestamp : Time.Time;
  };

  // Conversion function
  func roundToView(round : Round) : RoundView {
    {
      roundId = round.roundId;
      phase = round.phase;
      result = round.result;
      bets = round.bets.toArray();
      totalRedBets = round.totalRedBets;
      totalGreenBets = round.totalGreenBets;
      totalVioletBets = round.totalVioletBets;
      startTime = round.startTime;
    };
  };

  module Round {
    public func fromCount(count : Nat) : Round {
      {
        roundId = count;
        phase = #betting { startTime = Time.now() };
        result = null;
        bets = Map.empty<Principal, Bet>();
        totalRedBets = 0;
        totalGreenBets = 0;
        totalVioletBets = 0;
        startTime = Time.now();
      };
    };
  };

  type User = {
    coins : Nat;
    lastBonusTime : Time.Time;
    betHistory : List.List<Bet>;
    withdrawalRequests : List.List<WithdrawalRequest>;
    dailyStreak : Nat;
  };

  type MultiplierConfig = {
    red : Float;
    green : Float;
    violet : Float;
  };

  // State
  let userState = Map.empty<Principal, User>();
  let bettingPhaseRounds = Map.empty<Nat, Round>();
  let revealPhaseRoundsState = Map.empty<Nat, Round>();
  let cooldownPhaseRounds = Map.empty<Nat, Round>();
  let revealPhaseSeconds : Nat = 5;
  let cooldownPhaseSeconds : Nat = 5;
  let initialMultipliers = { red = 2.0 : Float; green = 2.0 : Float; violet = 4.5 : Float }; // kept for upgrade compatibility
  let withdrawalRequestsState = Map.empty<Principal, List.List<WithdrawalRequest>>();
  let completedRounds = Map.empty<Nat, Round>();
  let adminLogs = List.empty<Text>();

  // Spin time state
  let userSpinTimes = Map.empty<Principal, Time.Time>();

  // Track which users have already received the first-deposit bonus
  let firstDepositBonusGiven = Map.empty<Principal, Bool>();

  // Track total approved deposit amount per user (to unlock betting)
  let userApprovedDepositTotal = Map.empty<Principal, Nat>();

  // Deposit requests state
  let depositRequests = List.empty<DepositRequest>();
  var depositRequestCount : Nat = 0;

  // Payment method state
  var paymentUpiId : Text = "6205006521@okbizaxis";
  var paymentQrImageUrl : Text = "/assets/fd4426e3-53eb-407e-a99a-c7978d669943_image-019d4ab9-3854-716b-93ac-e620b7e024db.png";

  var autoResolveMode : Bool = true;
  var manualResultMode : Bool = false;
  var nextManualResult : ?Text = null;
  var currentRoundId : Nat = 1;
  var currentPhase : GamePhase = #betting { startTime = Time.now() };
  var currentRoundStartTime : Time.Time = Time.now();

  var multiplierRed : Float = 2.0;
  var multiplierGreen : Float = 2.0;
  var multiplierViolet : Float = 4.5;

  // Super admin and admin role system
  let adminRoles = Map.empty<Principal, AdminRole>();
  let adminBalances = Map.empty<Principal, Nat>();
  let _hardcodedSuperAdmin = Principal.fromText("onvyb-m2rbc-y4r5k-ia6gl-wuz7s-3t7zt-zvdfu-nliud-acubt-hgfhj-lae");
  var superAdminPrincipal : ?Principal = ?_hardcodedSuperAdmin;
  adminRoles.add(_hardcodedSuperAdmin, #super_admin);

  // Force result state (super admin only)
  var forcedColor : ?Text = null;
  var forcedSize : ?Text = null;

  // Transaction logs
  let transactionLogs = List.empty<TransactionLog>();

  // Helper: require logged-in user (not anonymous)
  func requireLogin(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("You must be logged in to perform this action");
    };
  };

  // Helper: check if caller is super admin
  func isSuperAdmin(caller : Principal) : Bool {
    switch (superAdminPrincipal) {
      case (?sa) { sa == caller };
      case (null) { false };
    };
  };

  // Helper: check if caller is admin or super admin
  func isAdminOrSuper(caller : Principal) : Bool {
    if (isSuperAdmin(caller)) { return true };
    switch (adminRoles.get(caller)) {
      case (?#admin) { true };
      case (?#super_admin) { true };
      case (_) { false };
    };
  };

  // Get or create user profile
  func getUserProfileInternal(caller : Principal) : User {
    let defaultUser : User = {
      coins = startingCoins;
      lastBonusTime = 0;
      betHistory = List.empty<Bet>();
      withdrawalRequests = List.empty<WithdrawalRequest>();
      dailyStreak = 0;
    };
    switch (userState.get(caller)) {
      case (null) { defaultUser };
      case (?user) { user };
    };
  };

  func getPhaseString(phase : GamePhase) : Text {
    switch (phase) {
      case (#betting {}) { "betting" };
      case (#reveal {}) { "reveal" };
      case (#cooldown {}) { "cooldown" };
    };
  };

  func getRoundBetsTotal(bets : Map.Map<Principal, Bet>, color : Text) : Nat {
    var total = 0;
    for (bet in bets.values()) {
      if (bet.betColor == color) { total += bet.betAmount };
    };
    total;
  };

  // Queries
  public query ({ caller }) func getGameState() : async {
    currentRoundId : Nat;
    phase : Text;
    phaseStartTimestamp : Time.Time;
    roundHistory : [RoundView];
    autoResolve : Bool;
    manualResult : ?Text;
    multipliers : MultiplierConfig;
    forcedColor : ?Text;
    forcedSize : ?Text;
  } {
    let roundHistoryArray = completedRounds.toArray().map(func((_, round)) { roundToView(round) });
    let manualResult = if (manualResultMode) { nextManualResult } else { null };
    {
      currentRoundId;
      phase = getPhaseString(currentPhase);
      phaseStartTimestamp = currentRoundStartTime;
      roundHistory = roundHistoryArray;
      autoResolve = autoResolveMode;
      manualResult;
      multipliers = { red = multiplierRed; green = multiplierGreen; violet = multiplierViolet };
      forcedColor;
      forcedSize;
    };
  };

  public query ({ caller }) func getCurrentRoundBets() : async {
    red : Nat;
    green : Nat;
    violet : Nat;
  } {
    let currentRound = Round.fromCount(currentRoundId);
    {
      red = getRoundBetsTotal(currentRound.bets, "red");
      green = getRoundBetsTotal(currentRound.bets, "green");
      violet = getRoundBetsTotal(currentRound.bets, "violet");
    };
  };

  // User profile endpoints
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    requireLogin(caller);
    let internalUser = getUserProfileInternal(caller);
    let spinTime = switch (userSpinTimes.get(caller)) { case null 0; case (?t) t };
    ?{
      coins = internalUser.coins;
      lastBonusTime = internalUser.lastBonusTime;
      betHistory = internalUser.betHistory.toArray();
      withdrawalRequests = internalUser.withdrawalRequests.toArray();
      dailyStreak = internalUser.dailyStreak;
      lastSpinTime = spinTime;
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    requireLogin(caller);
    let internalUser = getUserProfileInternal(user);
    let spinTime2 = switch (userSpinTimes.get(user)) { case null 0; case (?t) t };
    ?{
      coins = internalUser.coins;
      lastBonusTime = internalUser.lastBonusTime;
      betHistory = internalUser.betHistory.toArray();
      withdrawalRequests = internalUser.withdrawalRequests.toArray();
      dailyStreak = internalUser.dailyStreak;
      lastSpinTime = spinTime2;
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    requireLogin(caller);
    let newUser : User = {
      coins = profile.coins;
      lastBonusTime = profile.lastBonusTime;
      betHistory = List.fromArray(profile.betHistory);
      withdrawalRequests = List.fromArray(profile.withdrawalRequests);
      dailyStreak = profile.dailyStreak;
    };
    userSpinTimes.add(caller, profile.lastSpinTime);
    userState.add(caller, newUser);
  };

  func compareHoldingsByAmount(a : (Principal, Nat), b : (Principal, Nat)) : Order.Order {
    Int.compare(b.1, a.1);
  };

  public query ({ caller }) func getAllUserHoldings() : async [(Principal, Nat)] {
    requireLogin(caller);
    userState.toArray().map(func((principal, user)) { (principal, user.coins) }).sort(compareHoldingsByAmount);
  };

  public query ({ caller }) func getCurrentRoundPhase() : async Text {
    getPhaseString(currentPhase);
  };

  // Get payment method (public)
  public query func getPaymentMethod() : async PaymentMethod {
    { upiId = paymentUpiId; qrImageUrl = paymentQrImageUrl };
  };

  // Set payment method (admin only)
  public shared ({ caller }) func setPaymentMethod(upiId : Text, qrImageUrl : Text) : async () {
    requireLogin(caller);
    paymentUpiId := upiId;
    paymentQrImageUrl := qrImageUrl;
    adminLogs.add("Admin updated payment method: UPI=" # upiId);
  };

  // Submit deposit request
  public shared ({ caller }) func submitDepositRequest(amount : Nat) : async () {
    requireLogin(caller);
    if (amount == 0) { Runtime.trap("Must deposit more than 0") };

    let alreadyGotBonus = switch (firstDepositBonusGiven.get(caller)) {
      case (?true) true;
      case (_) {
        switch (userState.get(caller)) {
          case (null) {
            firstDepositBonusGiven.add(caller, true);
            true
          };
          case (_) false;
        }
      };
    };
    let bonusAmount = if (not alreadyGotBonus and amount >= 100) { 100 } else { 0 };

    let request : DepositRequest = {
      user = caller;
      amount;
      bonusAmount;
      requestTime = Time.now();
      approved = false;
      index = depositRequestCount;
    };
    depositRequestCount += 1;
    depositRequests.add(request);
    adminLogs.add("Deposit request: User " # caller.toText() # " requested " # amount.toText() # " coins, bonus=" # bonusAmount.toText());
  };

  // Get all deposit requests (admin)
  public query ({ caller }) func getAllDepositRequests() : async [DepositRequest] {
    requireLogin(caller);
    depositRequests.toArray();
  };

  // Approve deposit request (admin)
  public shared ({ caller }) func approveDeposit(requestIndex : Nat) : async () {
    requireLogin(caller);

    let requestsArray = depositRequests.toArray();
    var found = false;
    var approvedUser : Principal = Principal.fromText("aaaaa-aa");
    var approvedAmount : Nat = 0;
    var approvedBonus : Nat = 0;

    for (req in requestsArray.values()) {
      if (req.index == requestIndex and not req.approved) {
        found := true;
        approvedUser := req.user;
        approvedAmount := req.amount;
        approvedBonus := req.bonusAmount;
      };
    };

    if (not found) {
      Runtime.trap("Deposit request not found or already approved");
    };

    let existingUser = getUserProfileInternal(approvedUser);
    let totalCoins = approvedAmount + approvedBonus;
    let newUser = {
      coins = existingUser.coins + totalCoins;
      lastBonusTime = existingUser.lastBonusTime;
      betHistory = existingUser.betHistory;
      withdrawalRequests = existingUser.withdrawalRequests;
      dailyStreak = existingUser.dailyStreak;
    };
    userState.add(approvedUser, newUser);

    if (approvedBonus > 0) {
      firstDepositBonusGiven.add(approvedUser, true);
    };

    // Track approved deposit total for betting eligibility
    let prevTotal = switch (userApprovedDepositTotal.get(approvedUser)) { case null 0; case (?t) t };
    userApprovedDepositTotal.add(approvedUser, prevTotal + approvedAmount);

    let updatedRequests = List.empty<DepositRequest>();
    for (req in requestsArray.values()) {
      if (req.index == requestIndex) {
        updatedRequests.add({
          user = req.user;
          amount = req.amount;
          bonusAmount = req.bonusAmount;
          requestTime = req.requestTime;
          approved = true;
          index = req.index;
        });
      } else {
        updatedRequests.add(req);
      };
    };
    depositRequests.clear();
    for (req in updatedRequests.values()) {
      depositRequests.add(req);
    };

    // Log transaction
    transactionLogs.add({
      userId = approvedUser;
      adminId = caller;
      amount = totalCoins;
      logType = "deposit";
      timestamp = Time.now();
    });

    adminLogs.add("Admin approved deposit for user " # approvedUser.toText() # ": " # approvedAmount.toText() # " + " # approvedBonus.toText() # " bonus coins");
  };

  // Get caller total approved deposit amount
  public query ({ caller }) func getCallerApprovedDepositTotal() : async Nat {
    requireLogin(caller);
    switch (userApprovedDepositTotal.get(caller)) { case null 0; case (?t) t };
  };

  // Check if user has had an approved deposit of at least MIN_DEPOSIT_TO_BET
  public query ({ caller }) func hasApprovedDeposit() : async Bool {
    requireLogin(caller);
    let total = switch (userApprovedDepositTotal.get(caller)) { case null 0; case (?t) t };
    total >= MIN_DEPOSIT_TO_BET;
  };

  // Place bet - requires approved deposit of min 100, NO hard bet limit, only balance check
  public shared ({ caller }) func placeBet(color : Text, amount : Nat) : async () {
    requireLogin(caller);

    // Gate: user must have an approved deposit of at least 100 before betting
    let approvedTotal = switch (userApprovedDepositTotal.get(caller)) { case null 0; case (?t) t };
    if (approvedTotal < MIN_DEPOSIT_TO_BET) {
      Runtime.trap("You must make a deposit of at least \u{20B9}100 and have it approved before you can place bets");
    };

    switch (currentPhase) {
      case (#betting { startTime = _ }) {
        let existingUser = getUserProfileInternal(caller);

        if (amount == 0) { Runtime.trap("Bet must be greater than 0") };
        if (existingUser.coins < amount) { Runtime.trap("Insufficient coins for bet") };

        let bet : Bet = {
          betColor = color;
          betAmount = amount;
          betTime = Time.now();
        };

        let newBetHistory = existingUser.betHistory;
        newBetHistory.add(bet);
        userState.add(
          caller,
          {
            coins = existingUser.coins - amount;
            lastBonusTime = existingUser.lastBonusTime;
            betHistory = newBetHistory;
            withdrawalRequests = existingUser.withdrawalRequests;
            dailyStreak = existingUser.dailyStreak;
          },
        );

        adminLogs.add("User " # caller.toText() # ": Bet " # amount.toText() # " coins on " # color);
      };
      case (_) {
        Runtime.trap("Bets can only be placed during the betting phase");
      };
    };
  };

  // Claim Daily Bonus
  public shared ({ caller }) func claimDailyBonus() : async () {
    requireLogin(caller);

    let existingUser = getUserProfileInternal(caller);

    if (Time.now() - existingUser.lastBonusTime < dailyBonusCooldown) {
      Runtime.trap("Daily bonus available once every 24 hours");
    };

    let isStreakUpdate = Time.now() - existingUser.lastBonusTime < 48 * 60 * 60 * 1_000_000_000;
    let newStreak = if (isStreakUpdate) { Nat.max(existingUser.dailyStreak + 1, 1) } else { 1 };

    let bonusAmount : Nat = 10;
    let newUser = {
      coins = existingUser.coins + bonusAmount;
      lastBonusTime = Time.now();
      betHistory = existingUser.betHistory;
      withdrawalRequests = existingUser.withdrawalRequests;
      dailyStreak = newStreak;
    };

    userState.add(caller, newUser);
    adminLogs.add("User " # caller.toText() # " claimed daily bonus (+" # bonusAmount.toText() # ")");
  };

  // Deposit coins (direct credit)
  public shared ({ caller }) func depositCoins(amount : Nat) : async () {
    requireLogin(caller);
    if (amount == 0) { Runtime.trap("Must deposit more than 0 coins") };
    let existingUser = getUserProfileInternal(caller);
    let newUser = {
      coins = existingUser.coins + amount;
      lastBonusTime = existingUser.lastBonusTime;
      betHistory = existingUser.betHistory;
      withdrawalRequests = existingUser.withdrawalRequests;
      dailyStreak = existingUser.dailyStreak;
    };
    userState.add(caller, newUser);
    adminLogs.add("Deposit: User " # caller.toText() # " deposited " # amount.toText() # " coins");
  };

  // Request withdrawal
  public shared ({ caller }) func requestWithdrawal(amount : Nat) : async () {
    requireLogin(caller);

    let current = getUserProfileInternal(caller);
    if (current.coins < amount) { Runtime.trap("Insufficient coins for withdrawal") };
    if (amount == 0) { Runtime.trap("Withdrawal amount must be greater than 0") };

    let withdrawalRequest : WithdrawalRequest = {
      amount;
      requestTime = Time.now();
      processed = false;
    };

    let newUser = {
      coins = current.coins - amount;
      lastBonusTime = current.lastBonusTime;
      betHistory = current.betHistory;
      withdrawalRequests = current.withdrawalRequests;
      dailyStreak = current.dailyStreak;
    };
    userState.add(caller, newUser);

    switch (withdrawalRequestsState.get(caller)) {
      case (null) {
        let newRequestsList = List.singleton<WithdrawalRequest>(withdrawalRequest);
        withdrawalRequestsState.add(caller, newRequestsList);
      };
      case (?existingRequests) {
        existingRequests.add(withdrawalRequest);
        withdrawalRequestsState.add(caller, existingRequests);
      };
    };
    adminLogs.add("Withdrawal request: User " # caller.toText() # " requested " # amount.toText() # " coins");
  };

  // Get withdrawal requests (admin)
  public query ({ caller }) func getAllWithdrawalRequests() : async [(Principal, WithdrawalRequest)] {
    requireLogin(caller);
    let withdrawalRequestsList = List.empty<(Principal, WithdrawalRequest)>();
    let mapArray = withdrawalRequestsState.toArray();
    for ((principal, requestsList) in mapArray.values()) {
      for (request in requestsList.values()) {
        withdrawalRequestsList.add((principal, request));
      };
    };
    withdrawalRequestsList.toArray();
  };

  // Mark withdrawal as processed (admin)
  public shared ({ caller }) func markWithdrawalProcessed(user : Principal, index : Nat) : async () {
    requireLogin(caller);
    switch (withdrawalRequestsState.get(user)) {
      case (null) { Runtime.trap("No withdrawal requests found for user") };
      case (?requests) {
        let arr = requests.toArray();
        if (index >= arr.size()) {
          Runtime.trap("No withdrawal request at index " # index.toText());
        };
        let newList = List.empty<WithdrawalRequest>();
        var i = 0;
        for (req in arr.values()) {
          if (i == index) {
            newList.add({ amount = req.amount; requestTime = req.requestTime; processed = true });
          } else {
            newList.add(req);
          };
          i += 1;
        };
        withdrawalRequestsState.add(user, newList);
      };
    };
    adminLogs.add("Admin marked withdrawal as processed for user " # user.toText());
  };

  // Admin: Update multipliers
  public shared ({ caller }) func setMultipliers(red : Float, green : Float, violet : Float) : async () {
    requireLogin(caller);
    multiplierRed := red;
    multiplierGreen := green;
    multiplierViolet := violet;
    adminLogs.add("Admin updated multipliers: red=" # red.toText() # ", green=" # green.toText() # ", violet=" # violet.toText());
  };

  // Toggle auto-resolve mode
  public shared ({ caller }) func toggleAutoResolve() : async () {
    requireLogin(caller);
    autoResolveMode := not autoResolveMode;
    adminLogs.add("Admin toggled auto-resolve mode to " # (if autoResolveMode { "on" } else { "off" }));
  };

  // Set manual result
  public shared ({ caller }) func setManualResultOverride(result : Text) : async () {
    requireLogin(caller);
    manualResultMode := true;
    nextManualResult := ?result;
    adminLogs.add("Admin set manual result override for next round: " # result);
  };

  public shared ({ caller }) func clearManualOverride() : async () {
    requireLogin(caller);
    manualResultMode := false;
    nextManualResult := null;
    adminLogs.add("Admin cleared manual result override");
  };

  // ========== SUPER ADMIN & ROLE SYSTEM ==========

  // Set super admin principal (can only be called once, or by existing super admin)
  public shared ({ caller }) func setSuperAdmin(newSuperAdmin : Principal) : async () {
    requireLogin(caller);
    switch (superAdminPrincipal) {
      case (null) {
        // First time - anyone can set it (should be called right after deploy)
        superAdminPrincipal := ?newSuperAdmin;
        adminRoles.add(newSuperAdmin, #super_admin);
        adminLogs.add("Super admin set to: " # newSuperAdmin.toText());
      };
      case (?existing) {
        if (existing != caller) {
          Runtime.trap("Only the current super admin can change super admin");
        };
        superAdminPrincipal := ?newSuperAdmin;
        adminRoles.add(newSuperAdmin, #super_admin);
        adminLogs.add("Super admin changed to: " # newSuperAdmin.toText());
      };
    };
  };

  // Assign admin role (super admin only)
  public shared ({ caller }) func assignAdminRole(user : Principal, role : Text) : async () {
    requireLogin(caller);
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Only super admin can assign roles");
    };
    let adminRole : AdminRole = if (role == "admin") { #admin } else { #user };
    adminRoles.add(user, adminRole);
    adminLogs.add("Super admin assigned role '" # role # "' to user " # user.toText());
  };

  // Get caller's admin role
  public query ({ caller }) func getCallerAdminRole() : async Text {
    if (isSuperAdmin(caller)) { return "super_admin" };
    switch (adminRoles.get(caller)) {
      case (?#super_admin) { "super_admin" };
      case (?#admin) { "admin" };
      case (_) { "user" };
    };
  };

  // Get super admin principal (public query for frontend)
  public query func getSuperAdminPrincipal() : async ?Principal {
    superAdminPrincipal;
  };

  // ========== ADMIN WALLET SYSTEM ==========

  // Get admin balance (admins can check their own balance)
  public query ({ caller }) func getAdminBalance(admin : Principal) : async Nat {
    requireLogin(caller);
    switch (adminBalances.get(admin)) {
      case (null) { 0 };
      case (?bal) { bal };
    };
  };

  // Get caller's own admin balance
  public query ({ caller }) func getMyAdminBalance() : async Nat {
    requireLogin(caller);
    switch (adminBalances.get(caller)) {
      case (null) { 0 };
      case (?bal) { bal };
    };
  };

  // Super admin assigns coins to admin
  public shared ({ caller }) func assignCoinsToAdmin(admin : Principal, amount : Nat) : async () {
    requireLogin(caller);
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Only super admin can assign coins to admins");
    };
    let currentBal = switch (adminBalances.get(admin)) { case null 0; case (?b) b };
    adminBalances.add(admin, currentBal + amount);
    transactionLogs.add({
      userId = admin;
      adminId = caller;
      amount = amount;
      logType = "admin_assign";
      timestamp = Time.now();
    });
    adminLogs.add("Super admin assigned " # amount.toText() # " coins to admin " # admin.toText());
  };

  // ========== FORCE RESULT (SUPER ADMIN ONLY) ==========

  // Force result for current round
  public shared ({ caller }) func forceResult(color : Text, size : Text) : async () {
    requireLogin(caller);
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Only super admin can force results");
    };
    forcedColor := ?color;
    forcedSize := ?size;
    adminLogs.add("Super admin forced result: color=" # color # ", size=" # size);
  };

  // Clear forced result
  public shared ({ caller }) func clearForcedResult() : async () {
    requireLogin(caller);
    if (not isSuperAdmin(caller)) {
      Runtime.trap("Only super admin can clear forced results");
    };
    forcedColor := null;
    forcedSize := null;
    adminLogs.add("Super admin cleared forced result");
  };

  // Get force result status
  public query ({ caller }) func getForceResultStatus() : async {
    forcedColor : ?Text;
    forcedSize : ?Text;
    isActive : Bool;
  } {
    {
      forcedColor;
      forcedSize;
      isActive = forcedColor != null or forcedSize != null;
    };
  };

  // ========== TRANSACTION LOGS ==========

  public query ({ caller }) func getTransactionLogs() : async [TransactionLog] {
    requireLogin(caller);
    transactionLogs.toArray();
  };

  func safeSubtractNatAndInt(natValue : Nat, intValue : Int) : Nat {
    if (Int.abs(intValue) > natValue) {
      Runtime.trap("Cannot reduce coins - user does not have enough coins");
    };
    let natIntConversion = natValue + intValue;
    if (natIntConversion < 0) { 0 } else { natIntConversion.toNat() };
  };

  // Admin: Adjust user coins
  public shared ({ caller }) func adjustUserCoins(user : Principal, amount : Int) : async () {
    requireLogin(caller);
    let current = getUserProfileInternal(user);

    if (amount < 0) {
      let requestedAmount = Int.abs(amount);
      if (requestedAmount > current.coins) {
        Runtime.trap("Cannot reduce coins - user does not have " # requestedAmount.toText() # " coins");
      };
    };

    let newCoinAmount = if (amount > 0) {
      current.coins + Int.abs(amount);
    } else {
      safeSubtractNatAndInt(current.coins, amount);
    };

    let newUser = {
      coins = newCoinAmount;
      lastBonusTime = current.lastBonusTime;
      betHistory = current.betHistory;
      withdrawalRequests = current.withdrawalRequests;
      dailyStreak = current.dailyStreak;
    };
    userState.add(user, newUser);

    transactionLogs.add({
      userId = user;
      adminId = caller;
      amount;
      logType = "adjust";
      timestamp = Time.now();
    });

    adminLogs.add("Admin adjusted user " # user.toText() # "'s coin balance to " # newCoinAmount.toText());
  };

  // Admin: Set user coins directly
  public shared ({ caller }) func setUserCoins(user : Principal, amount : Nat) : async () {
    requireLogin(caller);
    let current = getUserProfileInternal(user);
    let newUser = {
      coins = amount;
      lastBonusTime = current.lastBonusTime;
      betHistory = current.betHistory;
      withdrawalRequests = current.withdrawalRequests;
      dailyStreak = current.dailyStreak;
    };
    userState.add(user, newUser);
    adminLogs.add("Admin set user " # user.toText() # "'s coins to " # amount.toText());
  };

  // Spin wheel (once per 24 hours, wins from [9, 19, 29] coins only)
  let spinCooldown = 24 * 60 * 60 * 1_000_000_000;
  let spinPrizes : [Nat] = [9, 19, 29];

  public shared ({ caller }) func spinWheel() : async Nat {
    requireLogin(caller);
    let existingUser = getUserProfileInternal(caller);
    let lastSpinTime = switch (userSpinTimes.get(caller)) { case null 0; case (?t) t };

    if (Time.now() - lastSpinTime < spinCooldown) {
      Runtime.trap("Spin available once every 24 hours");
    };

    let timeNow = Time.now();
    let seed = Int.abs(timeNow) % 3;
    let wonAmount = spinPrizes[seed];

    let newUser = {
      coins = existingUser.coins + wonAmount;
      lastBonusTime = existingUser.lastBonusTime;
      betHistory = existingUser.betHistory;
      withdrawalRequests = existingUser.withdrawalRequests;
      dailyStreak = existingUser.dailyStreak;
    };
    userState.add(caller, newUser);
    userSpinTimes.add(caller, timeNow);
    adminLogs.add("User " # caller.toText() # " spun wheel and won " # wonAmount.toText() # " coins");
    wonAmount;
  };

  public query ({ caller }) func hasFirstDepositBonus() : async Bool {
    switch (firstDepositBonusGiven.get(caller)) {
      case (?true) true;
      case (_) false;
    };
  };

  public query ({ caller }) func getCallerDepositRequests() : async [DepositRequest] {
    requireLogin(caller);
    let result = List.empty<DepositRequest>();
    for (req in depositRequests.values()) {
      if (req.user == caller) {
        result.add(req);
      };
    };
    result.toArray();
  };

  public query ({ caller }) func getCallerWithdrawalRequests() : async [WithdrawalRequest] {
    requireLogin(caller);
    switch (withdrawalRequestsState.get(caller)) {
      case (null) { [] };
      case (?requests) { requests.toArray() };
    };
  };

  public query ({ caller }) func getAdminLogs() : async [Text] {
    requireLogin(caller);
    adminLogs.toArray();
  };
};

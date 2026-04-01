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
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // CONSTANTS
  let startingCoins = 100;
  let betLimit = 100;
  let roundTimeSeconds = 60;
  let betPhaseSeconds = 45;
  let revealPhaseSeconds = 5;
  let dailyBonusCooldown = 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds

  // Types
  public type UserProfile = {
    coins : Nat;
    lastBonusTime : Time.Time;
    betHistory : [Bet];
    withdrawalRequests : [WithdrawalRequest];
    dailyStreak : Nat;
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

  // Conversion function to immutable, returned in query functions
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

  type SystemState = {
    autoResolve : Bool;
    manualResultOverride : ?Text;
    currentRound : Round;
    roundCount : Nat;
    multipliers : MultiplierConfig;
    lastTwentyRounds : List.List<Round>;
  };

  // State
  let userState = Map.empty<Principal, User>();
  let withdrawalRequestsState = Map.empty<Principal, List.List<WithdrawalRequest>>();
  let bettingPhaseRounds = Map.empty<Nat, Round>();
  let revealPhaseRoundsState = Map.empty<Nat, Round>();
  let cooldownPhaseRounds = Map.empty<Nat, Round>();
  let completedRounds = Map.empty<Nat, Round>();
  let adminLogs = List.empty<Text>();

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var autoResolveMode : Bool = true;
  var manualResultMode : Bool = false;
  var nextManualResult : ?Text = null;
  var currentRoundId : Nat = 1;
  var currentPhase : GamePhase = #betting { startTime = Time.now() };
  var currentRoundStartTime : Time.Time = Time.now();

  // Initialize user actor state on new deployment
  let initialMultipliers : MultiplierConfig = {
    red = 2.0;
    green = 2.0;
    violet = 4.5;
  };

  // Get or create user profile without changing state
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

  func getNextRoundPhase() : GamePhase {
    switch (currentPhase) {
      case (#betting { startTime }) {
        #reveal { startTime = Time.now(); result = null };
      };
      case (#reveal { startTime; result }) {
        #cooldown { startTime = Time.now() };
      };
      case (#cooldown { startTime }) {
        #betting { startTime = Time.now() };
      };
    };
  };

  // Process round result after time passes (manual or automatic)
  func processRound(phase : GamePhase, phaseStartTime : Time.Time) {
    switch (currentPhase, phase) {
      case (
        #betting { startTime = previousBetStartTime },
        #reveal { startTime = revealStartTime; result }
      ) {
        let betting = revealStartTime - previousBetStartTime;
      };
      case (
        #reveal { startTime = previousRevealStartTime; result },
        #cooldown { startTime = cooldownStartTime }
      ) {
        processPhaseTransition("reveal", previousRevealStartTime, "cooldown", cooldownStartTime);
      };
      case (
        #cooldown { startTime = previousCooldownStartTime },
        #betting { startTime = newBettingPhaseStart }
      ) {
        processPhaseTransition("cooldown", previousCooldownStartTime, "betting", newBettingPhaseStart);
      };
      case (_) {};
    };
  };

  func processPhaseTransition(fromPhase : Text, fromTime : Time.Time, toPhase : Text, toTime : Time.Time) {
    let phaseTransitionStr = "New " # toPhase # " phase started at " # toTime.toText() # ". Previous (from " # fromTime.toText() # ")";
    adminLogs.add(phaseTransitionStr);
  };

  // Util for time conversion
  func getCurrentSeconds() : Nat {
    ((Time.now() / 1_000_000_000).toNat()) % (60 * 60 * 24);
  };

  func getPreviousPhase(_timestamp : Time.Time) : GamePhase {
    func getPreviousPhaseHelper(currentPhase : GamePhase) : GamePhase {
      switch (currentPhase) {
        case (#betting(_)) { #cooldown { startTime = Time.now() } };
        case (#reveal(_)) { #betting { startTime = Time.now() } };
        case (#cooldown(_)) { #reveal { startTime = Time.now(); result = null } };
      };
    };
    getPreviousPhaseHelper(currentPhase);
  };

  // Queries - Public (no auth required)
  public query ({ caller }) func getGameState() : async {
    currentRoundId : Nat;
    phase : Text;
    phaseStartTimestamp : Time.Time;
    roundHistory : [RoundView];
    autoResolve : Bool;
    manualResult : ?Text;
    multipliers : MultiplierConfig;
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
      multipliers = initialMultipliers;
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

  // User profile endpoints (required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    let internalUser = getUserProfileInternal(caller);
    ?{
      coins = internalUser.coins;
      lastBonusTime = internalUser.lastBonusTime;
      betHistory = internalUser.betHistory.toArray();
      withdrawalRequests = internalUser.withdrawalRequests.toArray();
      dailyStreak = internalUser.dailyStreak;
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    let internalUser = getUserProfileInternal(user);
    ?{
      coins = internalUser.coins;
      lastBonusTime = internalUser.lastBonusTime;
      betHistory = internalUser.betHistory.toArray();
      withdrawalRequests = internalUser.withdrawalRequests.toArray();
      dailyStreak = internalUser.dailyStreak;
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    // Convert profile to internal User format
    let newUser : User = {
      coins = profile.coins;
      lastBonusTime = profile.lastBonusTime;
      betHistory = List.fromArray(profile.betHistory);
      withdrawalRequests = List.fromArray(profile.withdrawalRequests);
      dailyStreak = profile.dailyStreak;
    };
    userState.add(caller, newUser);
  };

  func compareHoldingsByAmount(a : (Principal, Nat), b : (Principal, Nat)) : Order.Order {
    Int.compare(b.1, a.1);
  };

  public query ({ caller }) func getAllUserHoldings() : async [(Principal, Nat)] {
    userState.toArray().map(func((principal, user)) { (principal, user.coins) }).sort(compareHoldingsByAmount);
  };

  // Current round phase - Public
  public query ({ caller }) func getCurrentRoundPhase() : async Text {
    getPhaseString(currentPhase);
  };

  // TIME-BASED
  // Place bet (update, only in betting phase) - USER ONLY
  public shared ({ caller }) func placeBet(color : Text, amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can place bets");
    };

    switch (currentPhase) {
      case (#betting { startTime }) {
        let existingUser = getUserProfileInternal(caller);

        // Validation
        if (amount <= 0) { Runtime.trap("Bet must be greater than 0") };
        if (existingUser.coins < amount) { Runtime.trap("Insufficient coins for bet") };
        if (amount > betLimit) { Runtime.trap("Bet exceeds max allowed") };
        if (Time.now() - startTime > betPhaseSeconds * 1_000_000_000) { Runtime.trap("Betting phase timeout") };

        // Create Bet
        let bet : Bet = {
          betColor = color;
          betAmount = amount;
          betTime = Time.now();
        };

        // Add to map
        currentPhase := #betting { startTime };
        let updatedRound = Round.fromCount(currentRoundId);

        // Update user state (remove coins and track bet)
        userState.add(
          caller,
          {
            coins = existingUser.coins - amount;
            lastBonusTime = existingUser.lastBonusTime;
            betHistory = existingUser.betHistory;
            withdrawalRequests = existingUser.withdrawalRequests;
            dailyStreak = existingUser.dailyStreak;
          },
        );

        // Add entry to bet
        adminLogs.add("User " # caller.toText() # ": New bet " # amount.toText() # " coins on " # color);
        updatedRound.bets.add(caller, bet);
      };
      case (_) {
        Runtime.trap("Bets can only be placed during the betting phase");
      };
    };
  };

  // Claim Daily Bonus (100 coins update, 24h cooldown) - USER ONLY
  public shared ({ caller }) func claimDailyBonus() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can claim daily bonus");
    };

    let existingUser = getUserProfileInternal(caller);

    // Validate cooldown
    if (Time.now() - existingUser.lastBonusTime < dailyBonusCooldown) {
      Runtime.trap("Daily bonus available once every 24 hours");
    };

    let isStreakUpdate = Time.now() - existingUser.lastBonusTime < 48 * 60 * 60 * 1_000_000_000;
    let newStreak = if (isStreakUpdate) { Nat.max(existingUser.dailyStreak + 1, 1) } else {
      1;
    };

    let newUser = {
      coins = existingUser.coins + 100;
      lastBonusTime = Time.now();
      betHistory = existingUser.betHistory;
      withdrawalRequests = existingUser.withdrawalRequests;
      dailyStreak = newStreak;
    };

    // Update or create user
    userState.add(caller, newUser);
    adminLogs.add("User " # caller.toText() # " claimed daily bonus - new total: " # newUser.coins.toText());
  };

  // Deposit coins (simulate only - add coins to balance) - USER ONLY
  public shared ({ caller }) func depositCoins(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can deposit coins");
    };

    if (amount <= 0) { Runtime.trap("Must deposit more than 0 coins") };
    let existingUser = getUserProfileInternal(caller);

    let newUser = {
      coins = existingUser.coins + amount;
      lastBonusTime = existingUser.lastBonusTime;
      betHistory = existingUser.betHistory;
      withdrawalRequests = existingUser.withdrawalRequests;
      dailyStreak = existingUser.dailyStreak;
    };
    userState.add(caller, newUser);
    adminLogs.add("Deposit: User " # caller.toText() # " deposited " # amount.toText() # " coins, new total: " # newUser.coins.toText());
  };

  // Request withdrawal (add request to array) - USER ONLY
  public shared ({ caller }) func requestWithdrawal(amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can request withdrawals");
    };

    let current = getUserProfileInternal(caller);
    if (current.coins < amount) { Runtime.trap("Insufficient coins for withdrawal") };

    // Reduce user coins immediately
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

    // Add withdrawal request to user's request list
    switch (withdrawalRequestsState.get(caller)) {
      case (null) {
        let newRequestsList = List.singleton<WithdrawalRequest>(withdrawalRequest);
        withdrawalRequestsState.add(caller, newRequestsList);
      };
      case (?existingRequests) {
        let reversedRequests = existingRequests.reverse();
        reversedRequests.add(withdrawalRequest);
        withdrawalRequestsState.add(caller, reversedRequests.reverse());
      };
    };
    adminLogs.add("Withdrawal request: User " # caller.toText() # " requested " # amount.toText() # " coins");
  };

  // Get withdrawal requests (admin only)
  public query ({ caller }) func getAllWithdrawalRequests() : async [(Principal, WithdrawalRequest)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view withdrawal requests");
    };
    let withdrawalRequestsList = List.empty<(Principal, WithdrawalRequest)>();

    // Convert map to persistent array of (Principal, List.List<WithdrawalRequest>)
    let mapArray = withdrawalRequestsState.toArray();

    // Populate persistent list with all (Principal, WithdrawalRequest) pairs
    for ((principal, requestsList) in mapArray.values()) {
      for (request in requestsList.values()) {
        withdrawalRequestsList.add((principal, request));
      };
    };

    // Convert persistent list to array
    withdrawalRequestsList.toArray();
  };

  // Mark withdrawal as processed (admin only)
  public shared ({ caller }) func markWithdrawalProcessed(user : Principal, index : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can process withdrawals");
    };
    switch (withdrawalRequestsState.get(user)) {
      case (null) { Runtime.trap("No withdrawal request at index " # index.toText()) };
      case (?requests) {
        if (index >= requests.size()) {
          Runtime.trap("No withdrawal request at index " # index.toText());
        };
        requests.reverse().add({ amount = index; requestTime = Time.now(); processed = true });
        withdrawalRequestsState.add(user, requests.reverse());
      };
    };
    adminLogs.add("Admin marked withdrawal as processed for user " # user.toText() # " with amount " # index.toText());
  };

  // Admin: Update multipliers (ADMIN ONLY)
  public shared ({ caller }) func setMultipliers(red : Float, green : Float, violet : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set multipliers");
    };
    adminLogs.add("Admin updated multipliers: red=" # red.toText() # ", green=" # green.toText() # ", violet=" # violet.toText());
  };

  // Toggle auto-resolve mode for next round (ADMIN ONLY)
  public shared ({ caller }) func toggleAutoResolve() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can toggle auto-resolve");
    };
    autoResolveMode := not autoResolveMode;
    adminLogs.add("Admin toggled auto-resolve mode to " # (if autoResolveMode { "on" } else {
      "off";
    }));
  };

  // Admin: Set manual result for next round (ADMIN ONLY)
  public shared ({ caller }) func setManualResultOverride(result : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set manual result override");
    };
    manualResultMode := true;
    nextManualResult := ?result;
    adminLogs.add("Admin set manual result override for next round: " # result);
  };

  public shared ({ caller }) func clearManualOverride() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can clear manual override");
    };
    manualResultMode := false;
    nextManualResult := null;
    adminLogs.add("Admin cleared manual result override");
  };

  func safeSubtractNatAndInt(natValue : Nat, intValue : Int) : Nat {
    if (Int.abs(intValue) > natValue) {
      Runtime.trap("Cannot reduce coins - user does not have enough coins");
    };
    let natIntConversion = natValue + intValue;
    if (natIntConversion < 0) { 0 } else { natIntConversion.toNat() };
  };

  // Admin functions to directly update user balances (ADMIN ONLY)
  public shared ({ caller }) func adjustUserCoins(user : Principal, amount : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can adjust user coins");
    };
    let current = getUserProfileInternal(user);

    // If negative amount, make sure they have enough coins
    if (amount < 0) {
      let requestedAmount = Int.abs(amount);
      if (requestedAmount > current.coins) {
        Runtime.trap("Cannot reduce coins - user does not have " # requestedAmount.toText() # " coins");
      };
    };

    // Set new balance
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
    adminLogs.add("Admin adjusted user " # user.toText() # "'s coin balance to " # newCoinAmount.toText());
  };

  public query ({ caller }) func getAdminLogs() : async [Text] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view logs");
    };
    adminLogs.toArray();
  };
};

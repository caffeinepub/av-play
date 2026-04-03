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
  let betLimit = 100_000;
  let roundTimeSeconds = 60;
  let betPhaseSeconds = 50;
  let dailyBonusCooldown = 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds

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
  // Legacy stable variables kept for upgrade compatibility (do not remove)
  let bettingPhaseRounds = Map.empty<Nat, Round>();
  let revealPhaseRoundsState = Map.empty<Nat, Round>();
  let cooldownPhaseRounds = Map.empty<Nat, Round>();
  let revealPhaseSeconds : Nat = 5;
  let cooldownPhaseSeconds : Nat = 5;
  let initialMultipliers = { red = 2.0 : Float; green = 2.0 : Float; violet = 4.5 : Float };
  let withdrawalRequestsState = Map.empty<Principal, List.List<WithdrawalRequest>>();
  let completedRounds = Map.empty<Nat, Round>();
  let adminLogs = List.empty<Text>();

  // Spin time state (separate map to avoid stable type compatibility issues)
  let userSpinTimes = Map.empty<Principal, Time.Time>();

  // Track which users have already received the first-deposit bonus
  let firstDepositBonusGiven = Map.empty<Principal, Bool>();

  // Deposit requests state
  let depositRequests = List.empty<DepositRequest>();
  var depositRequestCount : Nat = 0;

  // Payment method state
  var paymentUpiId : Text = "6205006521@okbizaxis";
  var paymentQrImageUrl : Text = "/assets/fd4426e3-53eb-407e-a99a-c7978d669943_image-019d4ab9-3854-716b-93ac-e620b7e024db.png";

  // Authorization mixin (required by platform - keep include)
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var autoResolveMode : Bool = true;
  var manualResultMode : Bool = false;
  var nextManualResult : ?Text = null;
  var currentRoundId : Nat = 1;
  var currentPhase : GamePhase = #betting { startTime = Time.now() };
  var currentRoundStartTime : Time.Time = Time.now();

  var multiplierRed : Float = 2.0;
  var multiplierGreen : Float = 2.0;
  var multiplierViolet : Float = 4.5;

  // Helper: require logged-in user (not anonymous)
  func requireLogin(caller : Principal) {
    if (caller.isAnonymous()) {
      Runtime.trap("You must be logged in to perform this action");
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

  // Set payment method (admin only - frontend handles auth)
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

    // Bonus only on first deposit of ₹100+
    let alreadyGotBonus = switch (firstDepositBonusGiven.get(caller)) {
      case (?true) true;
      case (_) false;
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

    // Credit coins to user
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

    // If bonus was given, mark it so it won't be given again
    if (approvedBonus > 0) {
      firstDepositBonusGiven.add(approvedUser, true);
    };

    // Mark request as approved
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

    adminLogs.add("Admin approved deposit for user " # approvedUser.toText() # ": " # approvedAmount.toText() # " + " # approvedBonus.toText() # " bonus coins");
  };

  // Place bet
  public shared ({ caller }) func placeBet(color : Text, amount : Nat) : async () {
    requireLogin(caller);

    switch (currentPhase) {
      case (#betting { startTime = _ }) {
        let existingUser = getUserProfileInternal(caller);

        if (amount == 0) { Runtime.trap("Bet must be greater than 0") };
        if (existingUser.coins < amount) { Runtime.trap("Insufficient coins for bet") };
        if (amount > betLimit) { Runtime.trap("Bet exceeds max allowed") };


        let bet : Bet = {
          betColor = color;
          betAmount = amount;
          betTime = Time.now();
        };

        // Update user coins and track bet
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

        adminLogs.add("User " # caller.toText() # ": New bet " # amount.toText() # " coins on " # color);
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

    let newUser = {
      coins = existingUser.coins + 100;
      lastBonusTime = Time.now();
      betHistory = existingUser.betHistory;
      withdrawalRequests = existingUser.withdrawalRequests;
      dailyStreak = newStreak;
    };

    userState.add(caller, newUser);
    adminLogs.add("User " # caller.toText() # " claimed daily bonus - new total: " # newUser.coins.toText());
  };

  // Deposit coins (direct credit for testing)
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
    adminLogs.add("Admin adjusted user " # user.toText() # "'s coin balance to " # newCoinAmount.toText());
  };


  // Spin wheel (once per 24 hours, wins from [9, 19, 29] coins only)
  let spinCooldown = 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds
  let spinPrizes : [Nat] = [9, 19, 29];

  public shared ({ caller }) func spinWheel() : async Nat {
    requireLogin(caller);
    let existingUser = getUserProfileInternal(caller);
    let lastSpinTime = switch (userSpinTimes.get(caller)) { case null 0; case (?t) t };

    if (Time.now() - lastSpinTime < spinCooldown) {
      Runtime.trap("Spin available once every 24 hours");
    };

    // Pick a random prize from [9, 19, 29] using time-based pseudo-random
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

  // Check if a user has already received the first deposit bonus (query for frontend)
  public query ({ caller }) func hasFirstDepositBonus() : async Bool {
    switch (firstDepositBonusGiven.get(caller)) {
      case (?true) true;
      case (_) false;
    };
  };

  public query ({ caller }) func getAdminLogs() : async [Text] {
    requireLogin(caller);
    adminLogs.toArray();
  };
};

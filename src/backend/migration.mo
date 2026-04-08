import Map "mo:core/Map";
import List "mo:core/List";

// Migration: drop accessControlState (authorization mixin removed)
module {
  // ── Old types (inline from previous version) ─────────────────────────────
  type UserRole = { #admin; #guest; #user };

  // Raw internal Map/List shapes as they appear in the .most stable snapshot
  type Data<K, V> = { var count : Nat; kvs : [var ?(K, V)] };
  type Leaf<K, V> = { data : Data<K, V> };
  type Internal<K, V> = { children : [var ?Node<K, V>]; data : Data<K, V> };
  type Node<K, V> = { #internal : Internal<K, V>; #leaf : Leaf<K, V> };
  type StableMap<K, V> = { var root : Node<K, V>; var size : Nat };
  type StableList<T> = { var blockIndex : Nat; var blocks : [var [var ?T]]; var elementIndex : Nat };

  // The old accessControlState shape
  type OldAccessControlState = {
    var adminAssigned : Bool;
    userRoles : StableMap<Principal, UserRole>;
  };

  // ── Migration input: only the field(s) being consumed ───────────────────
  type OldActor = {
    accessControlState : OldAccessControlState;
  };

  // ── Migration output: empty — we only consume, produce nothing new ───────
  type NewActor = {};

  // Drop accessControlState — all other fields are implicitly inherited
  public func run(_old : OldActor) : NewActor { {} };
};

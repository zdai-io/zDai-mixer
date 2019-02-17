include "UTXOHasher.circom";

template Withdrawal() {
  signal input balance;
  signal input salt
  signal input owner;
  signal input hash;

  component hasher = UTXOHasher();

  hasher.balance <== balance;
  hasher.salt <== salt;
  hasher.owner <== owner;
  hash === hasher.hash;

}

component main = Withdrawal()

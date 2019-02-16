include "UTXOHasher.circom";

template Deposit() {
  signal input balance;
  signal input owner;
  signal output hash;

  signal private input salt

  component hasher = UTXOHasher();

  hasher.balance <== balance;
  hasher.salt <== salt;
  hasher.owner <== owner;
  hash <== hasher.hash;

}

component main = Deposit()

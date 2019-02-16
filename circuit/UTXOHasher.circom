include "../circomlib/circuits/pedersen.circom";
include "../circomlib/circuits/bitify.circom";

template UTXOHasher() {
  signal input balance;
  signal input salt
  signal input owner;
  signal output hash;

  component hasher = Pedersen(512);
  var cur = 0;
  var i;

  component b_balance = Num2Bits(240);
  b_balance.in <== balance;
  for (i = 0; i<240; i++) {
    hasher.in[cur] <== b_balance.out[i];
    cur+=1;
  }

  component b_salt = Num2Bits(112);
  b_salt.in <== salt;
  for (i = 0; i<112; i++) {
    hasher.in[cur] <== b_salt.out[i];
    cur+=1;
  }

  component b_owner = Num2Bits(160);
  b_owner.in <== owner;
  for (i = 0; i<160; i++) {
    hasher.in[cur] <== b_owner.out[i];
    cur+=1;
  }

  hash <== hasher.out[0];

}
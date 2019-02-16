include "UTXOHasher.circom";
include "../circomlib/circuits/comparators.circom";

template Selector(n) {
  signal input in[n];
  signal input sel[n];
  signal output out;
  signal t[n];

  var s1 = 0;
  var s2 = 0;

  for (var i = 0; i < n; i++){
    sel[i] * sel[i] === sel[i]
    s1 += sel[i];
    t[i] <== sel[i] * in[i];
    s2 += t[i];
  }
  s1 === 1
  s2 ==> out
}

template Transaction() {
  signal input owner;
  signal input in_salt[2];
  signal input all_in_hashes[10];
  signal input out_hash[2];

  
  signal private input in_selector[2][10];
  signal private input in_balance[2];
  signal private input out_balance[2];
  signal private input out_salt[2];
  signal private input out_owner[2];


  var i;
  var j;
  
  component in_hash[2];

  for(i=0; i<2; i++) {
    in_hash[i] = Selector(10);
    for(j=0; j<10; j++) {
      in_hash[i].in[j] <== all_in_hashes[j];
      in_hash[i].sel[j] <== in_selector[i][j];
    }
  }
  

  component in_equal = IsEqual();
  for(i=0; i<2; i++) {
    in_equal.in[i] <== in_hash[i].out;
  }

  out_balance[0] + out_balance[1] === in_balance[0] + (1 - in_equal.out) * in_balance[1]


  component in_hasher[2];
 
  in_hasher[0] = UTXOHasher();
  in_hasher[0].balance <== in_balance[0];
  in_hasher[0].salt <== in_salt[0];
  in_hasher[0].owner <== owner;
  in_hasher[0].hash === in_hash[0].out;

  in_hasher[1] = UTXOHasher();
  in_hasher[1].balance <== in_balance[1];
  in_hasher[1].salt <== in_salt[1] + (in_salt[0] - in_salt[1]) * in_equal.out;
  in_hasher[1].owner <== owner;
  in_hasher[1].hash === in_hash[1].out;

  component out_hasher[2];

  for(i=0; i<2; i++) {
    out_hasher[i] = UTXOHasher();
    out_hasher[i].balance <== out_balance[i];
    out_hasher[i].salt <== out_salt[i];
    out_hasher[i].owner <== out_owner[i];
    out_hasher[i].hash === out_hash[i];
  }

}

component main = Transaction();
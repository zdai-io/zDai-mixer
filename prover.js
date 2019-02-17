const Web3 = require("web3");
const circom = require("circom");
const snarkjs = require("snarkjs");
const groth = snarkjs["groth"];
const pedersen = require("./circomlib/src/pedersenHash.js");
const babyjub = require("./circomlib/src/babyjub.js");
const fs = require("fs");
const crypto = require("crypto");
const bigInt = require("big-integer");
const {stringifyBigInts, unstringifyBigInts} = require("./src/stringifybigint.js");

const fload = (fname) => unstringifyBigInts(JSON.parse(fs.readFileSync(fname, "utf8")));
const fdump = (fname, data) => fs.writeFileSync(fname, JSON.stringify(stringifyBigInts(data)), "utf8");
const rbigint = (nbytes) => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes));

function p256(n) {
  let nstr = n.toString(16);
  while (nstr.length < 64) nstr = "0"+nstr;
  nstr = `"0x${nstr}"`;
  return nstr;
}

process.stdin.resume();
process.stdin.setEncoding('utf8');





const snarks = {
  "Transaction": {
    circuit: new snarkjs.Circuit(fload("circuit/compiled/Transaction.json")),
    vk_proof: fload("circuit/compiled/Transaction_proving_key.json"),
    vk_verifier: fload("circuit/compiled/Transaction_verification_key.json")
  },
  "Deposit": {
    circuit: new snarkjs.Circuit(fload("circuit/compiled/Deposit.json")),
    vk_proof: fload("circuit/compiled/Deposit_proving_key.json"),
    vk_verifier: fload("circuit/compiled/Deposit_verification_key.json")
  },
  "Withdrawal": {
    circuit: new snarkjs.Circuit(fload("circuit/compiled/Withdrawal.json")),
    vk_proof: fload("circuit/compiled/Withdrawal_proving_key.json"),
    vk_verifier: fload("circuit/compiled/Withdrawal_verification_key.json")
  }
};

function generatecall(proof, public) {

  let inputs = "";
  for (let i=0; i<public.length; i++) {
      if (inputs != "") inputs = inputs + ",";
      inputs = inputs + p256(public[i]);
  }

  let S=`[[${p256(proof.pi_a[0])}, ${p256(proof.pi_a[1])}],` +
        `[[${p256(proof.pi_b[0][1])}, ${p256(proof.pi_b[0][0])}],[${p256(proof.pi_b[1][1])}, ${p256(proof.pi_b[1][0])}]],` +
        `[${p256(proof.pi_c[0])}, ${p256(proof.pi_c[1])}],` +
        `[${inputs}]]`;

  return S;
}


process.stdin.on('data', function(chunk) {
  const data = unstringifyBigInts(JSON.parse(chunk));
  const snark = snarks[data[0]];
  const input = data[1];
  const witness = snark.circuit.calculateWitness(input);
  const {proof, publicSignals} = groth.genProof(snark.vk_proof, witness);
  console.log(generatecall(proof, publicSignals));
});

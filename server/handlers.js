const circom = require("circom");
const snarkjs = require("snarkjs");
const groth = snarkjs["groth"];
const pedersen = require("../circomlib/src/pedersenHash.js");
const babyjub = require("../circomlib/src/babyjub.js");
const fs = require("fs");
const crypto = require("crypto");
const utils = require("../src/utils.js");


let transactionSnark, depositSnark, withdrawalSnark;

const stringify = (data) => JSON.stringify(utils.stringifyBigInts(data));
const unstringify = (data) => utils.unstringifyBigInts(data);

function serializeAndHashUTXO(tx) {
  const b = Buffer.concat([snarkjs.bigInt(tx.balance).leInt2Buff(30), snarkjs.bigInt(tx.salt).leInt2Buff(14), snarkjs.bigInt(tx.owner).leInt2Buff(20)]);
  const h = pedersen.hash(b);
  const hP = babyjub.unpackPoint(h);
  return hP[0];
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadSnark(filename) {
  const circuit = new snarkjs.Circuit(utils.fload("circuit/compiled/" + filename + ".json"));
  const prover = utils.fload("circuit/compiled/" + filename + "_proving_key.json");
  const verifier = utils.fload("circuit/compiled/" + filename + "_verification_key.json");

  return { circuit, prover, verifier }
}

function proveSnark(snark, input) {
  const witness = snark.circuit.calculateWitness(input);
  data = groth.genProof(snark.prover, witness);
  return utils.p256({
    pi_a: [data.proof.pi_a[0], data.proof.pi_a[1]],
    pi_b: [[data.proof.pi_b[0][1], data.proof.pi_b[0][0]], [data.proof.pi_b[1][1], data.proof.pi_b[1][0]]],
    pi_c: [data.proof.pi_c[0], data.proof.pi_c[1]],
    publicSignals: data.publicSignals,
  });
}

function verifySnark(snark, proof, publicSignals) {
  console.log(proof, publicSignals);
  return groth.isValid(snark.verifier, proof, publicSignals);
}

function load() {
  transactionSnark = loadSnark("Transaction");
  depositSnark = loadSnark("Deposit");
  withdrawalSnark = loadSnark("Withdrawal");
}

function proveDeposit(tx) {
  tx.hash = serializeAndHashUTXO(tx);
  return proveSnark(depositSnark, tx);
}

function proveWithdrawal(tx) {
  tx.hash = serializeAndHashUTXO(tx);  
  return proveSnark(withdrawalSnark, tx);
}

// TX: { owner, balance, salt }
// fakeHashes: array(8)
function proveTransaction(txIn1, txIn2, txOut1, txOut2, fakeHashes) {
  if (txOut2 == null) {
    txOut2 = {
      balance: 0,
      salt: utils.rbigint(14),
      owner: utils.rbigint(20),
    }
  }

  let hashes = fakeHashes;
  const hash0 = serializeAndHashUTXO(txIn1);
  hashes.push(hash0);

  let hash1;
  if (txIn2 != null) {
    hash1 = serializeAndHashUTXO(txIn2);
    hashes.push(hash1);
  } else {
    txIn2 = {
      balance: txIn1.balance,
      salt: utils.rbigint(14),
      owner: txIn1.owner,
    };
  }
  hashes = shuffle(hashes);
  let in_selector = [Array(10), Array(10)];
  for (let i = 0; i < 10; i++) {
    in_selector[0][i] = hash0 === hashes[i] ? 1 : 0;
    in_selector[1][i] = (hash1 || hash0) === hashes[i] ? 1 : 0;
  }
  
  const input = {
    owner: txIn1.owner,
    in_salt: [txIn1.salt, txIn2.salt],
    all_in_hashes: hashes,
    out_hash: [serializeAndHashUTXO(txOut1), serializeAndHashUTXO(txOut2)],

    in_selector: in_selector,
    in_balance: [txIn1.balance, txIn2.balance],
    out_balance: [txOut1.balance, txOut2.balance],
    out_salt: [txOut1.salt, txOut2.salt],
    out_owner: [txOut1.owner, txOut2.owner]
    
  };

  console.log(input);

  return proveSnark(transactionSnark, input);
}

function verifyDeposit(data) {
  return verifySnark(depositSnark, data.proof, data.publicSignals);
}

function verifyWithdrawal(data) {
  return verifySnark(withdrawalSnark, data.proof, data.publicSignals);
}

function verifyTransaction(data) {
  return verifySnark(transactionSnark, data.proof, data.publicSignals);
}


module.exports = { load, proveDeposit, proveWithdrawal, proveTransaction, stringify, unstringify, verifyTransaction, verifyDeposit, verifyWithdrawal };











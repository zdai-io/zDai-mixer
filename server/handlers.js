const circom = require("circom");
const snarkjs = require("snarkjs");
const groth = snarkjs["groth"];
const pedersen = require("../circomlib/src/pedersenHash.js");
const babyjub = require("../circomlib/src/babyjub.js");
const fs = require("fs");
const crypto = require("crypto");

const alt_bn_128_q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

let transationSnark, depositSnark, withdrawalSnark;

const fload = (fname) => JSON.parse(fs.readFileSync(fname, "utf8"));
const fdump = (fname, data) => fs.writeFileSync(fname, JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v), "utf8");
const rbigint = (nbytes) => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes))

function serializeAndHashUTXO(tx) {
  console.log(tx);
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

async function setupSnark(filename) {
  const circuitDef = await circom("circuit/" + filename + ".circom");
  const circuit = new snarkjs.Circuit(circuitDef)
  const setup = groth.setup(circuit);
  const prover = setup.vk_proof;
  const verifier = setup.vk_verifier;

  fdump("circuit/compiled/" + filename + ".json", circuitDef);
  fdump("circuit/compiled/" + filename + "_proving_key.json", prover);
  fdump("circuit/compiled/" + filename + "_verification_key.json", verifier);

  return { circuit, prover, verifier }
}

function loadSnark(filename) {
  const circuit = new snarkjs.Circuit(fload("circuit/compiled/" + filename + ".json"));
  const prover = fload("circuit/compiled/" + filename + "_proving_key.json");
  const verifier = fload("circuit/compiled/" + filename + "_verification_key.json");

  return { circuit, prover, verifier }
}

function proveSnark(snark, input) {
  const witness = snark.circuit.calculateWitness(input);
  return groth.genProof(snark.prover, witness);
}

function verifySnark(snark, proof, publicSignals) {
   return groth.isValid(snark.verifier, proof, publicSignals);
}

async function setup() {
  transationSnark = await setupSnark("Transaction");
  depositSnark = await setupSnark("Deposit");
  withdrawalSnark = await setupSnark("Withdrawal");
}

function load() {
  transationSnark = loadSnark("Transaction");
  depositSnark = loadSnark("Deposit");
  withdrawalSnark = loadSnark("Withdrawal");
}

function proveDeposit(tx) {
  tx.hash = serializeAndHashUTXO(tx);
  return proveSnark(depositSnark, tx);
}

function proveWithdraw(tx) {
  tx.hash = serializeAndHashUTXO(tx);  
  return proveSnark(withdrawalSnark, tx);
}

// TX: { owner, balance, salt }
// fakeHashes: array(8)
function proveTransaction(owner, txIn1, txIn2, txOut1, txOut2, fakeHashes) {
  let hashes = fakeHashes;
  const hash0 = serializeAndHashUTXO(txIn1);
  const hash1 = serializeAndHashUTXO(txIn2);
  hashes.push(hash0, hash1);
  hashes = shuffle(hashes);

  in_selector = [Array(10), Array(10)];
  for(let i = 0; i < 10; i++){
    in_selector[0][i] = hash0 == hashes[i] ? 1 : 0;
    in_selector[1][i] = hash1 == hashes[i] ? 1 : 0;
  }
  
  const input = {
    owner,
    in_salt: [txIn1.salt, txIn2.salt],
    all_in_hashes: hashes,
    out_hash: [serializeAndHashUTXO(txOut1), serializeAndHashUTXO(txOut2)],

    in_selector: in_selector,
    in_balance: [txIn1.balance, txIn2.balance],
    out_balance: [txOut1.balance, txOut2.balance],
    out_salt: [txOut1.salt, txOut2.salt],
    out_owner: [txOut1.owner, txOut2.owner]
    
  };

  return proveSnark(transactionSnark, input);
}


module.exports = { load, setup, proveDeposit, proveWithdraw, proveTransaction, verifySnark };











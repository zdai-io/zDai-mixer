// launch ganache with -i 7555

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

const alt_bn_128_q = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const fload = (fname) => unstringifyBigInts(JSON.parse(fs.readFileSync(fname, "utf8")));
const fdump = (fname, data) => fs.writeFileSync(fname, JSON.stringify(stringifyBigInts(data)), "utf8");
const rbigint = (nbytes) => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes))


const {tic, toc} = (function(){ 
  var timer=0;
  return {
    tic: function(){
      timer = Date.now();
    },
    toc: function(p){
      var t = Date.now();
      console.log( (typeof(p)=="string" ? p : "") + String((t - timer)/1000));
    }
  };
})();

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



const web3 = new Web3(Web3.providers.HttpProvider('http://localhost:8545'))

const sTransaction = {
  circuit: new snarkjs.Circuit(fload("circuit/compiled/Transaction.json")),
  vk_proof: fload("circuit/compiled/Transaction_proving_key.json"),
  vk_verifier: fload("circuit/compiled/Transaction_verification_key.json")
};

const sDeposit = {
  circuit: new snarkjs.Circuit(fload("circuit/compiled/Deposit.json")),
  vk_proof: fload("circuit/compiled/Deposit_proving_key.json"),
  vk_verifier: fload("circuit/compiled/Deposit_verification_key.json")
};

const sWithdrawal = {
  circuit: new snarkjs.Circuit(fload("circuit/compiled/Withdrawal.json")),
  vk_proof: fload("circuit/compiled/Withdrawal_proving_key.json"),
  vk_verifier: fload("circuit/compiled/Withdrawal_verification_key.json")
};

function addrToInt(addr) {
  return bigInt(addr.substr(2), "16").value;
}

function makeDeposit(contract, _account, _balance) {
  const account = addrToInt(_account);
  const balance = BigInt(_balance);
  const salt = rbigint(14);
  const tx = {
    balance: balance,
    salt: salt,
    owner: account
  };
  const hash = serializeAndHashUTXO(tx);

  const input = {
    balance: balance,
    salt: salt,
    owner: account,
    hash: hash
  };


  console.log(input);
  const witness = sDeposit.circuit.calculateWitness(input);
  const {proof, publicSignals} = groth.genProof(sDeposit.vk_proof, witness);
  console.log(publicSignals);
}

const main = async () => {
  const accounts = await web3.eth.getAccounts();
  const ozDai = fload("smart-contract/build/contracts/ZDai.json");
  const zDai = new web3.eth.Contract(ozDai.abi, ozDai.networks["7555"].address);
  let res = await zDai.methods.utxo(1).call();
  console.log(res);
  res = await zDai.methods.utxo(100).call();
  console.log(res);
  makeDeposit(zDai, accounts[0], web3.utils.toWei("0.01"));



};

main();
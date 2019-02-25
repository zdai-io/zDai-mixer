const circom = require("circom");
const snarkjs = require("snarkjs");
const groth = snarkjs["groth"];
const pedersen = require("../../circomlib/src/pedersenHash.js");
const babyjub = require("../../circomlib/src/babyjub.js");
const fs = require("fs");
const crypto = require("crypto");
const {stringifyBigInts, unstringifyBigInts} = require("../../src/utils.js");

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
  console.log(tx)
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


const main = async () => {
  try {
   const circuit = new snarkjs.Circuit(fload("circuit/compiled/Withdrawal.json"));
   const vk_proof = fload("circuit/compiled/Withdrawal_proving_key.json");
   const vk_verifier = fload("circuit/compiled/Withdrawal_verification_key.json");

    // const circuitDef = await circom("circuit/Withdrawal.circom");
    // fdump("circuit/compiled/Withdrawal.json", circuitDef);
    // const circuit = new snarkjs.Circuit(circuitDef)

    // tic();
    // const setup = groth.setup(circuit);
    // toc();

    // const vk_proof = setup.vk_proof;
    // fdump("circuit/compiled/Withdrawal_proving_key.json", vk_proof);
    // const vk_verifier = setup.vk_verifier;
    // fdump("circuit/compiled/Withdrawal_verification_key.json", vk_verifier);

    const withdrawal = {
        balance: rbigint(16),
        salt: rbigint(14),
        owner: rbigint(20) 
      };

    const hash = serializeAndHashUTXO(withdrawal);
    
    const input = {
      balance: withdrawal.balance,
      salt: withdrawal.salt,
      owner: withdrawal.owner,
      hash: hash,
    };
    console.log("Input:")
    console.log(input);

    tic();
    const witness = circuit.calculateWitness(input);
    const {proof, publicSignals} = groth.genProof(vk_proof, witness);
    toc();

    console.log("Public signals:");
    console.log(publicSignals);

    tic();
    if (groth.isValid(vk_verifier, proof, publicSignals)) {
      console.log("The proof is valid");
    } else {
      console.log("The proof is not valid");
    }
    toc();
  }
  catch(e) {
    console.error(e);
  }
};

main();
const circom = require("circom");
const snarkjs = require("snarkjs");
const groth = snarkjs["groth"];
const pedersen = require("../circomlib/src/pedersenHash.js");
const babyjub = require("../circomlib/src/babyjub.js");
const fs = require("fs");
const crypto = require("crypto");
const {stringifyBigInts, unstringifyBigInts} = require("../src/stringifybigint.js");

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


const main = async () => {
  try {
    const circuitDef = await circom("circuit/UTXOHasher_test.circom");
    const circuit = new snarkjs.Circuit(circuitDef)

    tic();
    const setup = groth.setup(circuit);
    toc();

    const input = {
      balance: rbigint(16),
      salt: rbigint(14),
      owner: rbigint(20) 
    };

    tic();
    const witness = circuit.calculateWitness(input);
    const {proof, publicSignals} = groth.genProof(setup.vk_proof, witness);
    toc();

    console.log("Public signals:");
    console.log(publicSignals);

    console.log("Checking manual manual:");
    console.log(publicSignals[0] == serializeAndHashUTXO(input));

    tic();
    if (groth.isValid(setup.vk_verifier, proof, publicSignals)) {
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
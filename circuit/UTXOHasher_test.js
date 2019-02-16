const circom = require("circom");
const zkSnark = require("snarkjs");
const groth = zkSnark["groth"];
const pedersen = require("../circomlib/src/pedersenHash.js");
const babyjub = require("../circomlib/src/babyjub.js");
const fs = require("fs");

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

function serializeAndHashUTXO(balance, salt, owner) {
  const b = Buffer.concat([BigInt(balance).leInt2Buff(30), BigInt(salt).leInt2Buff(14), BigInt(owner).leInt2Buff(20)]);
  const h = pedersen.hash(b);
  const hP = babyjub.unpackPoint(h);
  return hP[0];
}


const main = async () => {
  try {
    const circuitDef = await circom("circuit/UTXOHasher_test.circom");
    const circuit = new zkSnark.Circuit(circuitDef)

    tic();
    const setup = groth.setup(circuit);
    toc();

    const input = {
      balance: 10,
      salt: 1,
      owner: 100
    };

    tic();
    const witness = circuit.calculateWitness(input);
    const {proof, publicSignals} = groth.genProof(setup.vk_proof, witness);
    toc();

    console.log("Public signals:");
    console.log(publicSignals);

    console.log("Checking manual manual:");
    console.log(publicSignals[0] == serializeAndHashUTXO(input.balance, input.salt, input.owner));

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
const circom = require("circom");
const snarkjs = require("snarkjs");
const groth = snarkjs["groth"];
const pedersen = require("../../circomlib/src/pedersenHash.js");
const babyjub = require("../../circomlib/src/babyjub.js");
const fs = require("fs");
const crypto = require("crypto");
const {stringifyBigInts, unstringifyBigInts} = require("../../src/stringifybigint.js");

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
    const circuit = new snarkjs.Circuit(fload("circuit/compiled/Transaction.json"));
    const vk_proof = fload("circuit/compiled/Transaction_proving_key.json");
    const vk_verifier = fload("circuit/compiled/Transaction_verification_key.json");

    // const circuitDef = await circom("circuit/Transaction.circom");
    // fdump("circuit/compiled/Transaction.json", circuitDef);
    // const circuit = new snarkjs.Circuit(circuitDef)

    // tic();
    // const setup = groth.setup(circuit);
    // toc();

    // const vk_proof = setup.vk_proof;
    // fdump("circuit/compiled/Transaction_proving_key.json", vk_proof);
    // const vk_verifier = setup.vk_verifier;
    // fdump("circuit/compiled/Transaction_verification_key.json", vk_verifier);

    const current_address = rbigint(20);

    const transactions_in = [
      {
        balance: rbigint(16),
        salt: rbigint(14),
        owner: current_address 
      },
      {
        balance: rbigint(16),
        salt: rbigint(14),
        owner: current_address 
      }
    ];

    const transactions_out = [
      {
        balance: transactions_in[0].balance+transactions_in[1].balance,
        salt: rbigint(14),
        owner: rbigint(20) 
      },
      {
        balance: 0n,
        salt: rbigint(14),
        owner: rbigint(20) 
      }
    ];

    let hashes = Array.from(Array(8), (v,k) => rbigint(32) % alt_bn_128_q)
    const hash0 = serializeAndHashUTXO(transactions_in[0]);
    const hash1 = serializeAndHashUTXO(transactions_in[1]);
    hashes.push(hash0, hash1);
    hashes = shuffle(hashes);

    in_selector = [Array(10), Array(10)];
    for(let i = 0; i < 10; i++){
      in_selector[0][i] = hash0 == hashes[i] ? 1 : 0;
      in_selector[1][i] = hash1 == hashes[i] ? 1 : 0;
    }
  


/*
  signal input owner;
  signal input in_salt[2];
  signal input all_in_hashes[10];
  signal input out_hash[2];

  
  signal private input in_selector[2][10];
  signal private input in_balance[2];
  signal private input out_balance[2];
  signal private input out_salt[2];
  signal private input out_owner[2];

*/
    
    const input = {
      owner: current_address,
      in_salt: [transactions_in[0].salt, transactions_in[1].salt],
      all_in_hashes: hashes,
      out_hash: [serializeAndHashUTXO(transactions_out[0]), serializeAndHashUTXO(transactions_out[1])],

      in_selector:in_selector,
      in_balance: [transactions_in[0].balance, transactions_in[1].balance],
      out_balance: [transactions_out[0].balance, transactions_out[1].balance],
      out_salt: [transactions_out[0].salt, transactions_out[1].salt],
      out_owner: [transactions_out[0].owner, transactions_out[1].owner]
      
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
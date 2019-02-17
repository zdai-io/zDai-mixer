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


function p256(n) {
  let nstr = n.toString(16);
  while (nstr.length < 64) nstr = "0"+nstr;
  nstr = `0x${nstr}`;
  return nstr;
}

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

async function makeDeposit(contract, _account, _balance) {
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

  // console.log(JSON.stringify(stringifyBigInts(input)));
  // console.log(p256(hash));
  // console.log(await contract.methods.utxo(p256(hash)).call());


  const witness = sDeposit.circuit.calculateWitness(input);
  const {proof, publicSignals} = groth.genProof(sDeposit.vk_proof, witness);

  // console.log(JSON.stringify([[p256(proof.pi_a[0]), p256(proof.pi_a[1])], [[p256(proof.pi_b[0][1]), p256(proof.pi_b[0][0])], [p256(proof.pi_b[1][1]), p256(proof.pi_b[1][0])]],
  // [p256(proof.pi_c[0]), p256(proof.pi_c[1])], publicSignals.map(p256)]));

  // await contract.methods.deposit([p256(proof.pi_a[0]), p256(proof.pi_a[1])], 
  //   [[p256(proof.pi_b[0][1]), p256(proof.pi_b[0][0])], [p256(proof.pi_b[1][1]), p256(proof.pi_b[1][0])]], 
  //   [p256(proof.pi_c[0]), p256(proof.pi_c[1])], publicSignals.map(p256)).send({value:_balance, from:_account, gas:"2000000", gasprice:"2000000000"});
  
  for(let i = 1; i <10; i++) { console.log(i);
  const [pi_a, pi_b, pi_c, pubinputs] = [["0x16ad130715d3099719c185872eb920251a4a2ddd3579ea41b5538688bda228a4","0x282c07197266a7932098dcf841ecf3c9155145573acb7c5ef7ec8b45da4aef11"],[["0x1f298e0e5f8a410d16788e9200e804e4c085947cae8f7685d0648c825a93983d","0x22303cfad346fadefe0540736f9980530d1309e3f9cb4d6748aac96601ce63c1"],["0x201bf9e0c04855ed2030e1ec530c0cae46a8f180f69f6d5ffcc25a4253b5245c","0x15ecb92480aa9efbc1c9717aaa4706adf4f0d10851a5d22c3baa110951afd1b4"]],["0x0ebc08c0fd017d5732ea8621a6d8bef187593b3c02a652c7703e8f95d2ec9a8b","0x0561c7998d5b79415abbc3b2cfe8836ea22021cfb8ce99251f55f68c49876688"],["0x000000000000000000000000000000000000000000000000002386f26fc10000","0x0000000000000000000000003b42407cd0c0166476ff8601adbe915990eaf026","0x2dc89d7e4a479085f32fbdcb0dcb03d3f5c7d368232cd4acc2677d3b3e0fdd9e"]];

  //const [pi_a, pi_b, pi_c, pubinputs] = [[p256(proof.pi_a[0]), p256(proof.pi_a[1])], [[p256(proof.pi_b[0][1]), p256(proof.pi_b[0][0])], [p256(proof.pi_b[1][1]), p256(proof.pi_b[1][0])]], [p256(proof.pi_c[0]), p256(proof.pi_c[1])], [p256(publicSignals[0]), p256(publicSignals[1]), p256(publicSignals[2])]];
  await contract.methods.deposit(pi_a, pi_b, pi_c, pubinputs).send({value:_balance, from:_account, gas:"6000000", gasprice:"2000000000"});
  }
  console.log(await contract.methods.utxo(p256(hash)).call());


  



}

const main = async () => {
  const accounts = await web3.eth.getAccounts();
  const ozDai = fload("smart-contract/build/contracts/ZDai.json");
  const zDai = new web3.eth.Contract(ozDai.abi, ozDai.networks["7555"].address);
  await makeDeposit(zDai, accounts[0], web3.utils.toWei("0.01"));

};

main();
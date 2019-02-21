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
const {spawn} = require('child_process');



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



function addrToInt(addr) {
  return bigInt(addr.substr(2), "16").value;
}


let prover = spawn("node", ["prover.js"]);
//prover.unref();


async function makeProof(name, input) {
  console.log("Inputs: ", [name, stringifyBigInts(input)]);
  prover.stdin.write(JSON.stringify([name, stringifyBigInts(input)]));
  const res = JSON.parse(await new Promise(resolve => prover.stdout.on('data', resolve)));
  await prover.kill();
  prover = spawn("node", ["prover.js"]);
  return res;
}


async function makeDepositAndWithdrawal(contract, _account, _balance) {

  const account = addrToInt(_account);
  const balance = BigInt(_balance);
  let salt = rbigint(14);
  let tx = {
    balance: balance,
    salt: salt,
    owner: account
  };

  let hash = serializeAndHashUTXO(tx);
  let input = {
    balance: balance,
    salt: salt,
    owner: account,
    hash: hash
  };

  console.log("Current balance: "+web3.utils.fromWei(await web3.eth.getBalance(_account)));

  let [pi_a, pi_b, pi_c, pubinputs] = await makeProof('Deposit', input);
  await contract.methods.deposit(pi_a, pi_b, pi_c, pubinputs).send({value:_balance, from:_account, gas:"6000000", gasprice:"2000000000"});
  
  console.log("Balance after deposit "+web3.utils.fromWei(_balance)+ ": " +web3.utils.fromWei(await web3.eth.getBalance(_account)));

  [pi_a, pi_b, pi_c, pubinputs] = await makeProof('Withdrawal', input);
  await contract.methods.withdrawal(pi_a, pi_b, pi_c, pubinputs).send({from:_account, gas:"6000000", gasprice:"2000000000"});

  console.log("Balance after withdrawal: "+web3.utils.fromWei(await web3.eth.getBalance(_account)));

}


async function makeDepositAndTransferAndWithdrawal(contract, account, account2, balance) {

  let salt = rbigint(14);
  let deposit_utxo = {
    balance: BigInt(balance),
    salt: salt,
    owner: addrToInt(account)
  };

  let deposit_hash = serializeAndHashUTXO(deposit_utxo);

  let deposit_input = {
    balance: BigInt(balance),
    salt: salt,
    owner: addrToInt(account),
    hash: deposit_hash
  };

  console.log("Current balance at "+account+": "+web3.utils.fromWei(await web3.eth.getBalance(account)));
  console.log("Computing the snark to deposit...");
  let [pi_a, pi_b, pi_c, pubinputs] = await makeProof('Deposit', deposit_input);
  await contract.methods.deposit(pi_a, pi_b, pi_c, pubinputs).send({value:balance, from:account, gas:"6000000", gasprice:"2000000000"});
  console.log("Computed ...", [pi_a, pi_b, pi_c, pubinputs]);
  console.log("Balance after deposit "+web3.utils.fromWei(balance)+ ": " +web3.utils.fromWei(await web3.eth.getBalance(account)));



  const transactions_in = [
    deposit_utxo,
    deposit_utxo
  ];

  const transactions_out = [
    {
      balance: transactions_in[0].balance,
      salt: rbigint(14),
      owner: addrToInt(account2)
    },
    {
      balance: 0n,
      salt: rbigint(14),
      owner: addrToInt(account2)
    }
  ];
  console.log(`Attaching to unknown utxo for mixing the graph...`);
  const hashes = [1,2,3,4,5,6,7,8, deposit_hash, deposit_hash];
  const in_selector = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 1, 0]];
  const transaction_input = {
    owner: deposit_utxo.owner,
    in_salt: [transactions_in[0].salt, transactions_in[1].salt],
    all_in_hashes: hashes,
    out_hash: [serializeAndHashUTXO(transactions_out[0]), serializeAndHashUTXO(transactions_out[1])],

    in_selector:in_selector,
    in_balance: [transactions_in[0].balance, transactions_in[1].balance],
    out_balance: [transactions_out[0].balance, transactions_out[1].balance],
    out_salt: [transactions_out[0].salt, transactions_out[1].salt],
    out_owner: [transactions_out[0].owner, transactions_out[1].owner]
    
  };

  console.log(`Prepairing transfer from ${account} to ${account2}. Computing the snark for anonymous transfer...`);
  [pi_a, pi_b, pi_c, pubinputs] = await makeProof('Transaction', transaction_input);
  await contract.methods.transaction(pi_a, pi_b, pi_c, pubinputs).send({from:account, gas:"6000000", gasprice:"2000000000"});
  console.log("Computed ...", [pi_a, pi_b, pi_c, pubinputs]);
  let newUTXO = serializeAndHashUTXO(transactions_out[0]);
  console.log(`New UTXO ${p256(newUTXO)} status: ${await contract.methods.utxo(p256(newUTXO)).call()}`);
  console.log("Balance after transfer "+web3.utils.fromWei(await web3.eth.getBalance(account)));

  const withdrawal_input = {
    balance: transactions_out[0].balance,
    salt: transactions_out[0].salt,
    owner: addrToInt(account2),
    hash: newUTXO
  };

  console.log("Begin withdrawal from "+account2);
  console.log("Balance before withdrawal: "+web3.utils.fromWei(await web3.eth.getBalance(account2)));
  console.log("Computing the snark for withdrawal...");
  [pi_a, pi_b, pi_c, pubinputs] = await makeProof('Withdrawal', withdrawal_input);
  console.log("Computed ...", [pi_a, pi_b, pi_c, pubinputs]);
  await contract.methods.withdrawal(pi_a, pi_b, pi_c, pubinputs).send({from:account2, gas:"6000000", gasprice:"2000000000"});

  console.log("Balance after withdrawal: "+web3.utils.fromWei(await web3.eth.getBalance(account2)));

}


const main = async () => {
  const accounts = await web3.eth.getAccounts();
  const ozDai = fload("smart-contract/build/contracts/ZDai.json");
  const zDai = new web3.eth.Contract(ozDai.abi, ozDai.networks["7555"].address);
  await makeDepositAndTransferAndWithdrawal(zDai, accounts[0], accounts[1], web3.utils.toWei("1"));
  prover.kill();
};

main();
const Web3 = require("web3");
const axios = require('axios');
const fs = require("fs");
const crypto = require("crypto");
const bigInt = require("big-integer");
const snarkjs = require("snarkjs");
const utils = require("./src/utils.js");

const rbigint = (nbytes) => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes));
const addrToInt = (addr) => bigInt(addr.substr(2), "16").value;

const web3 = new Web3(Web3.providers.HttpProvider('http://localhost:8545'));
const ozDai = require("./smart-contract/build/contracts/ZDai.json");
const contract = new web3.eth.Contract(ozDai.abi, ozDai.networks["4447"].address);

const account1 = "0xd00B71E95f1c85b856dD54Cb0ad22891eAFaA5de";
const account2 = "0x5e1Cf484557D6F6664f9Bbe6c9E806ca472f8881";
const amount = web3.utils.toWei("1");

//-------
async function main() {
  // Deposit
  let salt1 = rbigint(14);
  let depositUtxo = {
    balance: amount,
    salt: salt1,
    owner: addrToInt(account1)
  };

  console.log("Getting proof for transaction:\n", utils.stringifyBigInts(depositUtxo));
  let resp = await axios.post('http://localhost:3000/prove-deposit', utils.stringifyBigInts(depositUtxo));
  console.log("Got response:\n", resp.data);
  console.log("Current balance:" + web3.utils.fromWei(await web3.eth.getBalance(account1)));
  console.log("Posting deposit to smart contract");
  let result = await contract.methods.deposit(resp.data.pi_a, resp.data.pi_b, resp.data.pi_c, resp.data.publicSignals)
    .send({value: amount, from: account1, gas: "6000000", gasprice: "2000000000"});
  console.log("Balance after deposit: " + web3.utils.fromWei(await web3.eth.getBalance(account1)));


  // Transaction
  let salt2 = rbigint(14);
  let outputUtxo = {
    balance: amount,
    salt: salt2,
    owner: addrToInt(account2)
  };
  let transaction = {
    txIn1: depositUtxo,
    txOut1: outputUtxo,
    fakeHashes: [1, 1, 1, 1, 1, 1, 1, 1, 1],
  };
  console.log("Getting proof for transaction:\n", utils.stringifyBigInts(transaction));
  resp = await axios.post('http://localhost:3000/prove-transaction', utils.stringifyBigInts(transaction));
  console.log("Got response:\n", resp.data);
  console.log("Current balance:" + web3.utils.fromWei(await web3.eth.getBalance(account2)));
  console.log("Posting transaction to smart contract");
  result = await contract.methods.transaction(resp.data.pi_a, resp.data.pi_b, resp.data.pi_c, resp.data.publicSignals)
    .send({from: account1, gas: "6000000", gasprice: "2000000000"});
  console.log("Balance after transaction: " + web3.utils.fromWei(await web3.eth.getBalance(account1)));


  // Withdraw
  console.log("Getting proof for transaction:\n", utils.stringifyBigInts(outputUtxo));
  resp = await axios.post('http://localhost:3000/prove-withdrawal', utils.stringifyBigInts(outputUtxo));
  console.log("Got response:\n", resp.data);

  console.log("Current balance:" + web3.utils.fromWei(await web3.eth.getBalance(account2)));
  console.log("Posting deposit to smart contract");
  result = await contract.methods.withdrawal(resp.data.pi_a, resp.data.pi_b, resp.data.pi_c, resp.data.publicSignals)
    .send({from: account2, gas: "6000000", gasprice: "2000000000"});
  console.log("Balance after withdrawal: " + web3.utils.fromWei(await web3.eth.getBalance(account2)));
}

main();
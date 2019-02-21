const Web3 = require("web3");
const axios = require('axios')
const fs = require("fs");
const crypto = require("crypto");
const bigInt = require("big-integer");
const snarkjs = require("snarkjs");
const {stringifyBigInts, unstringifyBigInts} = require("./src/stringifybigint.js");

const fload = (fname) => unstringifyBigInts(JSON.parse(fs.readFileSync(fname, "utf8")));
const fdump = (fname, data) => fs.writeFileSync(fname, JSON.stringify(stringifyBigInts(data)), "utf8");
const rbigint = (nbytes) => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes))
const addrToInt = (addr) => bigInt(addr.substr(2), "16").value;

const web3 = new Web3(Web3.providers.HttpProvider('http://localhost:8545'))

const contractAddr = "0x93536A202506d0A375A250bE6821e508c83880D6";
const account1 = "0xd00B71E95f1c85b856dD54Cb0ad22891eAFaA5de";
const account2 = "0xd00B71E95f1c85b856dD54Cb0ad22891eAFaA5de";
const amount = web3.utils.toWei("1")

//-------
async function main() {
  const ozDai = fload("smart-contract/build/contracts/ZDai.json");
  const contract = new web3.eth.Contract(ozDai.abi, ozDai.networks["4447"].address);

  let salt = rbigint(14);
  let deposit_utxo = {
    balance: amount,
    salt: salt,
    owner: addrToInt(account1)
  };
  console.log("Getting proof for transaction:\n", stringifyBigInts(deposit_utxo));
  let resp = await axios.post('https://prover.zdai.io/prove-deposit', stringifyBigInts(deposit_utxo));
  console.log("Got response:\n", resp.data);
  resp.data.proof.pi_a.pop(); resp.data.proof.pi_b.pop(); resp.data.proof.pi_c.pop();

  console.log("Current balance:" + web3.utils.fromWei(await web3.eth.getBalance(account1)));
  console.log("Posting deposit to smart contract");
  let result = await contract.methods.deposit(resp.data.proof.pi_a, resp.data.proof.pi_b, resp.data.proof.pi_c, resp.data.publicSignals)
    .send({value: amount, from: account1, gas: "6000000", gasprice: "2000000000"});
  console.log("Balance after deposit: " + web3.utils.fromWei(await web3.eth.getBalance(account1)));



  let withdraw_utxo = {
    balance: amount,
    salt: salt,
    owner: addrToInt(account2)
  };
  console.log("Getting proof for transaction:\n", stringifyBigInts(withdraw_utxo));
  resp = await axios.post('https://prover.zdai.io/prove-withdrawal', stringifyBigInts(withdraw_utxo));
  console.log("Got response:\n", resp.data);

  console.log("Current balance:" + web3.utils.fromWei(await web3.eth.getBalance(account2)));
  console.log("Posting deposit to smart contract");
  result = await contract.methods.withdrawal(resp.data.proof.pi_a, resp.data.proof.pi_b, resp.data.proof.pi_c, resp.data.publicSignals)
    .send({from: account2, gas: "6000000", gasprice: "2000000000"});
  console.log("Balance after withdrawal: " + web3.utils.fromWei(await web3.eth.getBalance(account2)));
}

main();
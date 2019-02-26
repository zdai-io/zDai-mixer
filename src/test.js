const Web3 = require("web3");
const axios = require('axios');
const bigInt = require("big-integer");
const utils = require("./utils.js");

const addrToInt = (addr) => bigInt(addr.substr(2), "16").value;

const web3 = new Web3(Web3.providers.HttpProvider('http://localhost:8545'));
const ozDai = require("../smart-contract/build/contracts/ZDai.json");
const contract = new web3.eth.Contract(ozDai.abi, ozDai.networks["4447"].address);

const account1 = "0xd00B71E95f1c85b856dD54Cb0ad22891eAFaA5de";
const account2 = "0x5e1Cf484557D6F6664f9Bbe6c9E806ca472f8881";
const amount = web3.utils.toWei("1");

async function getRandomUtxosFromContract(count, exclude) {
  let arr = [];
  let events = await contract.getPastEvents('UtxoCreated', { fromBlock: 0, toBlock: 'latest' });
  for(let utxo of events) {
    arr.push(utxo.returnValues.hash);
  }
  events = await contract.getPastEvents('UtxoRemoved', { fromBlock: 0, toBlock: 'latest' });
  for(let utxo of events) {
    let hash = utxo.returnValues.hash;
    let i = arr.indexOf(hash);
    if (i !== -1) arr.splice(i, 1);
  }
  for(let hash of exclude) {
    let i = arr.indexOf(hash);
    if (i !== -1) arr.splice(i, 1);
  }

  let result = [];
  for (let i = 0; i < count; i++) {
    let val = arr[Math.floor(Math.random() * arr.length)];
    let j = arr.indexOf(val);
    if (j !== -1) arr.splice(j, 1);
    result.push(val);
  }

  return result;
}



//-------
async function main() {
  // Deposit
  let depositUtxo = {
    balance: amount,
    salt: utils.rbigint(14),
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
  let outputUtxo = {
    balance: amount,
    salt: utils.rbigint(14),
    owner: addrToInt(account2)
  };
  let transaction = {
    txIn1: depositUtxo,
    txOut1: outputUtxo,
    fakeHashes: await getRandomUtxosFromContract(9, [utils.serializeAndHashUTXO(depositUtxo)]),
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
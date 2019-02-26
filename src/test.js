const Web3 = require("web3");
const axios = require('axios');
const bigInt = require("big-integer");
const utils = require("./utils.js");
const ozDai = require("../smart-contract/build/contracts/ZDai.json");

const web3Endpoint = 'https://dai.poa.network';
const proverEndpoint = 'https://prover.zdai.io';
const contractAddress = "0x6ebd2e953442b06fa0217067526b12997f7309db";
const account1 = "0xb6762AEc2b3cD39d31651CB48F38D1Cd4FDaFb8B";
const account2 = "0xb4124cEB3451635DAcedd11767f004d8a28c6eE7";
const privateKey1 = "0x123";
const privateKey2 = "0x456";

// const web3Endpoint = 'http://localhost:8545';
// const proverEndpoint = 'http://localhost:3000';
// const contractAddress = ozDai.networks["4447"].address;

const web3 = new Web3(Web3.providers.HttpProvider(web3Endpoint));
const contract = new web3.eth.Contract(ozDai.abi, contractAddress);
const amount = web3.utils.toWei("0.01");

const addrToInt = (addr) => bigInt(addr.substr(2), "16").value;
const getBalance = async (account) => web3.utils.fromWei(await web3.eth.getBalance(account));

// Get N random utxos from the smart contract excluding specified ones
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

// Get snark proof from the backend server
async function getProof(method, data) {
  data = utils.stringifyBigInts(data);
  console.log(`Getting proof for ${method}:\n`, data);
  let resp = await axios.post(`${proverEndpoint}/prove-${method}`, data);
  console.log("Got response:\n", resp.data);
  return resp.data;
}

// Call a smart contract method
async function callMethod(name, proof, data, privateKey) {
  console.log("Posting deposit to smart contract");
  let call = contract.methods[name](proof.pi_a, proof.pi_b, proof.pi_c, proof.publicSignals).encodeABI();
  data = {
    gas: "2000000",
    gasPrice: "1000000000",
    to: contractAddress,
    data: call,
    ...data,
  };
  console.log("Estimated gas:", await web3.eth.estimateGas(data));
  let tx = await web3.eth.accounts.signTransaction(data, privateKey);
  let result = await web3.eth.sendSignedTransaction(tx.rawTransaction);
  console.log("Tx completed, hash:", result.transactionHash);
  return result;
}

async function main() {
  // Deposit
  let depositUtxo = {
    balance: amount,
    salt: utils.rbigint(14),
    owner: addrToInt(account1)
  };

  let data = await getProof('deposit', depositUtxo);
  await callMethod('deposit', data, {value: amount, from: account1}, privateKey1);

  
  // Transaction
  let outputUtxo = {
    balance: amount,
    salt: utils.rbigint(14),
    owner: addrToInt(account2)
  };
  let transaction = {
    txIn1: depositUtxo,
    txOut1: outputUtxo,
    fakeHashes: await getRandomUtxosFromContract(9, utils.stringifyBigInts([utils.serializeAndHashUTXO(depositUtxo)])),
  };
  data = await getProof('transaction', transaction);
  // todo: verify utxo hashes of public inputs to make sure that proving server
  //  hasn't tampered with data before generating the proof
  await callMethod('transaction', data, {from: account1}, privateKey1);


  // Withdraw
  data = await getProof('withdrawal', outputUtxo);
  console.log("Current balance:" + await getBalance(account2));
  await callMethod('withdrawal', data, {from: account2}, privateKey2);
  console.log("Balance after withdrawal: " + await getBalance(account2));
}

main();
require('dotenv').config();
const PrivateKeyProvider = require("truffle-privatekey-provider");
const HDWalletProvider = require('truffle-hdwallet-provider');

const providerWithMnemonic = (mnemonic, rpcEndpoint) =>
  new HDWalletProvider(mnemonic, rpcEndpoint);

const infuraProvider = network => providerWithMnemonic(
  process.env.MNEMONIC || '',
  `https://${network}.infura.io/${process.env.INFURA_API_KEY}`
);

const ropstenProvider = process.env.SOLIDITY_COVERAGE
  ? undefined
  : infuraProvider('ropsten');

module.exports = {
  compilers: {
    solc: {
      version: "0.5.2",          
      settings: {
        optimizer: {
          enabled: true,
          runs: 200   
        }
      }
    }
  },
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase
    },
    ropsten: {
      provider: ropstenProvider,
      network_id: 3, // eslint-disable-line camelcase
    },
    coverage: {
      host: 'localhost',
      network_id: '*', // eslint-disable-line camelcase
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    testrpc: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase
    },
    ganache: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // eslint-disable-line camelcase
    },
    poa: {
      // network_id: '*',
      // provider: new PrivateKeyProvider(process.env.PRIVATE_KEY, "https://dai.poa.network/"),
      // function() {
      //   let WalletProvider = require("truffle-wallet-provider");
      //   let wallet = require('ethereumjs-wallet').fromPrivateKey(Buffer.from(process.env.PRIVATE_KEY, 'hex'));
      //   return new WalletProvider(wallet, "https://dai.poa.network/")
      // },
    },
  },
};

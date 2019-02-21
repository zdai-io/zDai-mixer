# zDai.io - private Dai transactions on Burner wallet
![Logo](https://github.com/snjax/zDai-mixer/blob/master/Demo/logo.png?raw=true)

  * [Idea](#idea)
    + [What problem do you solve?](#what-problem-do-you-solve)
    + [Why is it important?](#why-is-it-important)
    + [Why did we choose to work on the xDAI chain?](#why-did-we-choose-to-work-on-the-xdai-chain)
    + [What will happen to the project after hackathon?](#what-will-happen-to-the-project-after-hackathon)
    + [Zero Knowledge Challenges accepted :sunglasses:](#zero-knowledge-challenges-accepted--sunglasses)
  * [User-flow](#user-flow)
    + [Steps:](#steps)
    + [What we'he has done:](#what-we-he-has-done)
  * [DEMO:](#demo)
  * [Worked public version of Wallet: [zDai.io](zDai.io)](#worked-public-version-of-wallet---zdaiio--zdaiio)
    + [Contract Deploy:](#contract-deploy)
    + [Sokol testnet transaction](#sokol-testnet-transaction)
    + [TBD & Future steps:](#tbd---future-steps)
  * [Tech Scpec](#tech-scpec)
    + [Tests:](#tests)
  * [Tech spec:](#tech-spec)
    + [Output:](#output)
  * [Links:](#links)

## Idea

### What problem do you solve?

We add a privacy layer to the burner wallet running on the xDai sidechain.

### Why is it important?

As (hopefully) everyone noticed, we are using here web wallets with buffiDai, which is pegged to Dai and deployed on the xDai sidechain from POA to buy food, merch, drinks, art, some unusual things(ask me about it after the presentations – I will be happy to share my dealer network)

Our team loves [Burner](https://xdai.io/)'s usability and xDai's fast transaction times, but there is one problem we are bothered with: each vendor whom I pay can see the history of my transactions and as you already understand our buying patterns cry for a privacy layer to be added.

Luckily we can solve this issue.

### Why did we choose to work on the xDAI chain?

On a serious note, buffiDai wasn’t our primary motivation to build on top of the xDAI chain. There are several reasons why it is an ideal marriage between SNARKs and everyday use cases:

•    In xDAI, block times take 5 seconds. Transaction fees (gas costs) paid in DAI (=USD) are minimal, so it is cost-savvy and excellent for running our SNARKS verification (as opposed to doing it on Ethereum mainnet)
•    xDai chain takes the full functionality of Ethereum-based blockchains and can leverage all our open-source tools so that we could add our plasma to the existing POA Network’s tools and infrastructure.

### What will happen to the project after hackathon?
We see poor usability as the main roadblock for cryptocurrency adoption, especially in not so techy developing countries where it is most needed. So we hope our solution will make micropayments private and safe. We are looking forward to further collaborate on it with MakerDAO and POA community.

### Zero Knowledge Challenges accepted :sunglasses:


- **Ethereum Foundation** - zkSnark research and #BUIDL!  :closed_lock_with_key:

    - *Inspired by* [@barryWhiteHat](https://twitter.com/barrywhitehat/status/1096490137029095424?s=12)

    - https://kauri.io/article/3c7581f62c8b4babb78d3b133b415d60/v2/ethereum-foundation-sponsor-bounty-at-ethdenver2019!

- **Maker** :dollar:
    - Private transaction based on Zero Knowledge For Maker :dollar:
    - Burner wallet improvment :arrow_double_up: https://kauri.io/article/1aa7db4858614e21b0446a03680b9846/v1/makerdao-sponsor-bounty-at-ethdenver-2019!

- **POA** + Zero Knowledge = :heart:
    - https://kauri.io/article/3f2b37024c0e448293cd9099ad451f36/v2/poa-network-sponsor-bounty-at-ethdenver-2019!

## User-flow

We are bringing privacy to [Burner wallet](https://xdai.io) (all functionality is impemented directly in Burner wallet fork) and DAI infrastructure with confidential micropayments. :sunglasses:

### Steps:
- Open Burner wallet fork by link: zdai.io :iphone:
- Exchange xDAI to zDAI :currency_exchange:
- Send confidential private transaction :arrow_heading_up:
- ... Take a cup of ☕️, while zkSNARK proof is calculating (*approx 1 minute*)
- Profit!!! :tada:


### What we'he has done:

- Smart contract (link)
    - utxo based model
    - proover for snarks

- integration tests (Snarks + smart contracts) (link)

- trusted setup for 3 snarks (link)
    - deposit
    - Transfer
    - Exit

- Backend with snarks prover

- deploy script for the smart contract (R)

- Fork burner

- extra tool

## DEMO:

## Worked public version of Wallet: [zDai.io](zDai.io)

### Contract Deploy:
![Contract_Deploy](https://github.com/snjax/zDai-mixer/blob/master/Demo/COntract_Deploy.jpeg)

### Sokol testnet transaction

![Sokol testnet transaction](https://github.com/snjax/zDai-mixer/blob/master/Demo/Sokol-test.png)

### Burner fork with zDAI

![Burner fork with zDAI](https://github.com/snjax/zDai-mixer/blob/master/Demo/BurnerWallet.png)


### TBD & Future steps:

- Do **Trusted** setup (Sonic/zCash)
- Server side - is just a temporary thing, if we build snarks on Belman - we can put in in the mobile device directly! It takes around 2-3 MB


## Tech Scpec


### Tests:

    node cicruit/Transation_test.js

## Tech spec:

### Output:


- `hash`: balance + salt + owner = pederson hash

Example:

```
{ balance: 498617225799240496206585797313701272018n,
      salt: 940710224613798208468773453036456n,
      owner: 835765502661709741278231205743827595544796746504n }
```

input:
- `in_salt` - Double spend proof: slat is a random data generated with tx, to check unspent utxo further (spending utxo salt going to blacklist)
- `all_in_hashes` - 10 inputs to hide real input. (if you do more entropy - you can send tx to yourself), or we can put more in the snark.
- `our_hash`: 2 outputs - classic utxo outputs

`in_selcetor`: pick correct input and output.

Out balance example:

   ```
[ [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
     [ 0, 0, 0, 0, 1, 0, 0, 0, 0, 0 ] ],
```

---

## Our contract in POA Network Sokol.

https://blockscout.com/poa/sokol/address/0x97c931f57e2b1582d629fb52e0aaa82b7a19c9f0/transactions 

Here are just 3 transactions now: deposit, transfer and withdrawal. 

## Links:

- ETHDenver Application: https://kauri.io/article/4c026927f1cc4ed29d5a0e95ba3afbf8/v1/zdai.io-confidential-transactions-on-zksnarks
- Backend (with SNARK prover), Solidity smart contract is placed there: https://github.com/snjax/zDai-mixer/tree/master/circuit
- Burner wallet with improved functionality: https://github.com/poma/burner-wallet
- Smart Contract: https://blockscout.com/poa/sokol/address/0x97c931f57e2b1582d629fb52e0aaa82b7a19c9f0/transactions

#!/bin/sh

# You need to install circom and snarkjs in order for that to work:
# npm install -g circom snarkjs

circom circuit/Deposit.circom -o "circuit/compiled/Deposit.json"
snarkjs setup --protocol groth --pk "circuit/compiled/Deposit_proving_key.json" --vk "circuit/compiled/Deposit_verification_key.json" --circuit "circuit/compiled/Deposit.json"

circom circuit/Transaction.circom -o "circuit/compiled/Transaction.json"
snarkjs setup --protocol groth --pk "circuit/compiled/Transaction_proving_key.json" --vk "circuit/compiled/Transaction_verification_key.json" --circuit "circuit/compiled/Transaction.json"

circom circuit/Withdrawal.circom -o "circuit/compiled/Withdrawal.json"
snarkjs setup --protocol groth --pk "circuit/compiled/Withdrawal_proving_key.json" --vk "circuit/compiled/Withdrawal_verification_key.json" --circuit "circuit/compiled/Withdrawal.json"

# Generate verifier contract
node src/verifiergen.js




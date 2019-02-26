const express = require('express');
const snarkjs = require("snarkjs");
const groth = snarkjs["groth"];
const utils = require("../src/utils.js");
const bodyParser = require('body-parser');

const port = 3000;
let transactionSnark, depositSnark, withdrawalSnark;

function loadSnark(filename) {
	const circuit = new snarkjs.Circuit(utils.fload(`circuit/compiled/${filename}.json`));
	const prover = utils.fload(`circuit/compiled/${filename}_proving_key.json`);
	const verifier = utils.fload(`circuit/compiled/${filename}_verification_key.json`);

	return { circuit, prover, verifier }
}

function proveSnark(snark, input) {
	console.log("proving snark for:\n", input);
	const witness = snark.circuit.calculateWitness(input);
	const data = groth.genProof(snark.prover, witness);
	return utils.p256({
		pi_a: [data.proof.pi_a[0], data.proof.pi_a[1]],
		pi_b: [[data.proof.pi_b[0][1], data.proof.pi_b[0][0]], [data.proof.pi_b[1][1], data.proof.pi_b[1][0]]],
		pi_c: [data.proof.pi_c[0], data.proof.pi_c[1]],
		publicSignals: data.publicSignals,
	});
}

function verifySnark(snark, proof, publicSignals) {
	return groth.isValid(snark.verifier, proof, publicSignals);
}

function proveDeposit(tx) {
	tx.hash = tx.hash || utils.serializeAndHashUTXO(tx);
	return proveSnark(depositSnark, tx);
}

function proveWithdrawal(tx) {
	tx.hash = tx.hash || utils.serializeAndHashUTXO(tx);
	return proveSnark(withdrawalSnark, tx);
}

function proveTransaction(data) {
	let {txIn1, txIn2, txOut1, txOut2, fakeHashes} = data;

	// If the second output in not specified, create a random one with zero amount
	if (txOut2 == null) {
		txOut2 = {
			balance: 0,
			salt: utils.rbigint(14),
			owner: utils.rbigint(20),
		}
	}

	let hashes = fakeHashes;
	const hash0 = txIn1.hash || utils.serializeAndHashUTXO(txIn1);
	hashes.push(hash0);

	let hash1;
	// If the second input is not specified, use the balance and owner from the first one and a random salt,
	// and submit any random hash for it, also submit equal mapping arrays
	if (txIn2 != null) {
		hash1 = txIn2.hash || utils.serializeAndHashUTXO(txIn2);
		hashes.push(hash1);
	} else {
		txIn2 = {
			balance: txIn1.balance,
			salt: utils.rbigint(14),
			owner: txIn1.owner,
		};
	}
	hashes = utils.shuffle(hashes);
	let in_selector = [Array(10), Array(10)];
	for (let i = 0; i < 10; i++) {
		in_selector[0][i] = hash0 === hashes[i] ? 1 : 0;
		in_selector[1][i] = (hash1 || hash0) === hashes[i] ? 1 : 0;
	}

	const input = {
		owner: txIn1.owner,
		in_salt: [txIn1.salt, txIn2.salt],
		all_in_hashes: hashes,
		out_hash: [txOut1.hash || utils.serializeAndHashUTXO(txOut1), txOut2.hash || utils.serializeAndHashUTXO(txOut2)],

		in_selector: in_selector,
		in_balance: [txIn1.balance, txIn2.balance],
		out_balance: [txOut1.balance, txOut2.balance],
		out_salt: [txOut1.salt, txOut2.salt],
		out_owner: [txOut1.owner, txOut2.owner]
	};

	return proveSnark(transactionSnark, input);
}

function sendProofResult(req, res, action) {
	console.log("received data:\n", req.body);
	const data = utils.unstringifyBigInts(req.body);
	const result = action(data);
	console.log("proof:\n", result);
	res.send(JSON.stringify(utils.stringifyBigInts(result)));
}

function sendVerifyResult(req, res, snark) {
	console.log("received data:\n", req.body);
	const data = utils.unstringifyBigInts(req.body);
	const result = verifySnark(snark, data.proof, data.publicSignals);
	res.send(result);
	console.log("valid:", result);
}

let app = express();
app.use(bodyParser.json());
app.post('/prove-deposit',      (req, res) => sendProofResult(req, res, proveDeposit));
app.post('/prove-withdrawal',   (req, res) => sendProofResult(req, res, proveWithdrawal));
app.post('/prove-transaction',  (req, res) => sendProofResult(req, res, proveTransaction));
app.post('/verify-deposit',     (req, res) => sendVerifyResult(req, res, depositSnark));
app.post('/verify-withdrawal',  (req, res) => sendVerifyResult(req, res, withdrawalSnark));
app.post('/verify-transaction', (req, res) => sendVerifyResult(req, res, transactionSnark));
app.get('/', (req, res) => { res.send("Hello"); });

transactionSnark = loadSnark("Transaction");
depositSnark = loadSnark("Deposit");
withdrawalSnark = loadSnark("Withdrawal");

app.listen(port, () => {
  console.log("Express server listening on port " + port);
});
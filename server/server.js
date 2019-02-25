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
	tx.hash = utils.serializeAndHashUTXO(tx);
	return proveSnark(depositSnark, tx);
}

function proveWithdrawal(tx) {
	tx.hash = utils.serializeAndHashUTXO(tx);
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
	const hash0 = utils.serializeAndHashUTXO(txIn1);
	hashes.push(hash0);

	let hash1;
	// If the second input is not specified, use the balance and owner from the first one and a random salt,
	// and submit any random hash for it, also submit equal mapping arrays
	if (txIn2 != null) {
		hash1 = utils.serializeAndHashUTXO(txIn2);
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
		out_hash: [utils.serializeAndHashUTXO(txOut1), utils.serializeAndHashUTXO(txOut2)],

		in_selector: in_selector,
		in_balance: [txIn1.balance, txIn2.balance],
		out_balance: [txOut1.balance, txOut2.balance],
		out_salt: [txOut1.salt, txOut2.salt],
		out_owner: [txOut1.owner, txOut2.owner]

	};

	return proveSnark(transactionSnark, input);
}

function sendProofResult(req, res, action) {
	console.log("received data:", req.body);
	const data = utils.unstringifyBigInts(req.body);
	const result = action(data);
	console.log("proof:", result);
	res.send(JSON.stringify(utils.stringifyBigInts(result)));
}

function sendVerifyResult(req, res, snark) {
	console.log("received data:", req.body);
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


/*

Examples:

POST /prove-deposit, POST /prove-withdraw

{ "balance": "321488905428287453363989606204499985466",
  "salt": "5149157721255631752077661259559006",
  "owner": "459418993075025202163780373805394412891310183763" }

response:

{"proof":{"pi_a":["21167731325875670848878398048862804811594668054049252741606410942454107927794","21122358537663032973342134691289713247614827200765237216719231732508121703403","1"],"pi_b":[["383887557478858538273202765282468253886562914466831898841025081607735768092","6416317874666804858850400617530998393085907801919343871305559510068414148888"],["838158857635885757187948368029896992285862095213496804275384518065291490511","893872646424726482150086705373006785798840467406588607605387945176130614471"],["1","0"]],"pi_c":["11500145997600824182475010428064131820330538508097150436660201665968355623694","2017061155712552823266335017094590213336612009341399722272678648697969763196","1"],"protocol":"groth"},"publicSignals":["321488905428287453363989606204499985466","5149157721255631752077661259559006","459418993075025202163780373805394412891310183763","18029507226528251362268272019956669113554416764004133351094155024702618803528"]}

POST /verify-withdrawal

{"proof":{"pi_a":["15362860256474807002878662047156062701938779476200885306962131782718811014439","523530373907297158449023650877819161864523925373505787373445457885483960231","1"],"pi_b":[["14589066783638339416743287544192871706239672229601888741089861713969109551461","3161626994445813970659342425346323029409608447063827824854215230560737232830"],["21599843745346048755617489678193194286798048712258907763707332186178560076789","12742961595329148413302750551933630769845548063355030300457775397808306359392"],["1","0"]],"pi_c":["14666464442011094498115081354307556829790311206888753148812728156652159426604","7853145876848132235372003090835027878812048134171718394372628150988964149863","1"],"protocol":"groth"},"publicSignals":["321488905428287453363989606204499985466","5149157721255631752077661259559006","459418993075025202163780373805394412891310183763","18029507226528251362268272019956669113554416764004133351094155024702618803528"]}

response:

true

POST /prove-transaction

{
	
}

response:

{"proof":{"pi_a":["21167731325875670848878398048862804811594668054049252741606410942454107927794","21122358537663032973342134691289713247614827200765237216719231732508121703403","1"],"pi_b":[["383887557478858538273202765282468253886562914466831898841025081607735768092","6416317874666804858850400617530998393085907801919343871305559510068414148888"],["838158857635885757187948368029896992285862095213496804275384518065291490511","893872646424726482150086705373006785798840467406588607605387945176130614471"],["1","0"]],"pi_c":["11500145997600824182475010428064131820330538508097150436660201665968355623694","2017061155712552823266335017094590213336612009341399722272678648697969763196","1"],"protocol":"groth"},"publicSignals":["321488905428287453363989606204499985466","5149157721255631752077661259559006","459418993075025202163780373805394412891310183763","18029507226528251362268272019956669113554416764004133351094155024702618803528"]}


 */
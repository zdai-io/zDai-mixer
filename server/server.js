const express = require('express');
const handlers = require('./handlers');
var bodyParser = require('body-parser');
const port = 3000;
let app = express();
app.use(bodyParser.json());

async function deposit(req, res) {
	let result = handlers.proveDeposit(req.body);
	res.send(result);
}

async function withdraw(req, res) {
	let result = handlers.proveWithdraw(req.body);
	res.send(result);
}

function transaction(req, res) {
	let result = handlers.proveTransaction(req.body);
	res.send(result);
}

function verify(req, res) {
	let result = handlers.verifySnark(req.body);
	res.send(result);
}

app.post('/deposit', deposit);
app.post('/withdraw', withdraw);
app.post('/transaction', transaction);
app.post('/verify', verify);
app.get('/', (req, res) => { res.send("Hello"); });

handlers.load();

let server = app.listen(port, () => {
  console.log("Express server listening on port " + port);
});
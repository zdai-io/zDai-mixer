const SecurityTokenDraft = artifacts.require("./SecurityTokenDraft.sol");
const IdentityRegistry = artifacts.require("./IdentityRegistry.sol");
const truffleAssert = require('truffle-assertions');

let STO;
let IR;

const web3 = global.web3;

const tbn = v => web3.utils.toBN(v);
const fbn = v => v.toString();
const tw = v => web3.utils.toWei(v.toString());
const fw = v => web3.utils.fromWei(v.toString());

const gasPrice = tw("0.0000003");

function getRandom(min, max) {
    return (Math.random() * (max - min) + min).toFixed();
}

contract('SecurityTokenDraft', (accounts) => {

    let contractOwner = accounts[0];
    let symbol = "TST";
    let name = "TEST";
    let totalSupply = tbn(1e20);
    let registry;
    let limitUS = tbn(5);
    let limitNotAccredited = tbn(2);
    let totalLimit = tbn(9);

    async function Transfer(address){
       
        let transferAmount = new Array(accounts.length);

        let totalTransferedAmount = tbn(0);
        for (let i = 1; i < transferAmount.length; i++) {
            let val = getRandom(1, totalSupply/accounts.length);
            totalTransferedAmount = totalTransferedAmount.add(tbn(val));
            transferAmount[i] = val;
        }
    
        let balancesBefore = new Array(accounts.length);
        for (let i = 0; i < accounts.length; i++)
            balancesBefore[i] = await STO.balanceOf(accounts[i]);
    
        for (let i = 1; i < accounts.length; i++)
            await STO.transfer(accounts[i], transferAmount[i], {from: address, gasPrice: gasPrice});
    
        let balancesAfter = new Array(accounts.length);

        for (let i = 0; i < accounts.length; i++)
            balancesAfter[i] = await STO.balanceOf(accounts[i]);
    
        assert.equal(balancesBefore[0].toString(), balancesAfter[0].add(totalTransferedAmount).toString());
        for (let i = 1; i < accounts.length; i++)
            assert.equal(balancesAfter[i].toString(), transferAmount[i].toString());

    }

    function GenerateAccountsList(){
        return [[web3.utils.randomHex(20), true, true],
                                  [web3.utils.randomHex(20), true, false],
                                  [web3.utils.randomHex(20), false, false],
                                  [web3.utils.randomHex(20), false, true]];
    }

    beforeEach(async function() {
        IR = await IdentityRegistry.new({from: contractOwner});

        symbol = "TST";
        name = "TEST";
        totalSupply = tbn(1e20);
        registry = IR.address;
        limitUS = tbn(5);
        limitNotAccredited = tbn(2);
        totalLimit = tbn(9);

        STO = await SecurityTokenDraft.new(
            symbol,
            name,
            totalSupply,
            registry,
            limitUS,
            limitNotAccredited,
            totalLimit,
            {from: contractOwner}
            );
    });

    describe('COMMON TEST', () => {

        it("should check: If input parameters were set", async function() {
            let checkContractOwner = await IR.owner();
            let checkSymbol = await STO.symbol();
            let checkName = await STO.name();
            let checkTotalSupply = await STO.totalSupply();

            assert.equal(checkContractOwner, contractOwner);
            assert.equal(checkSymbol, symbol);
            assert.equal(checkName, name);
            assert(checkTotalSupply.eq(totalSupply));
        });

        it("should transfer from contract owner", async function() {
                await Transfer(contractOwner);
        });

        it("should transfer not from contract owner", async function() {
                // revert now
                // await Transfer(accounts[1]);
        });

    });

    describe('NEGATIVE TEST', () => {
        it("should overflow limitTotal", async function() {

        });

        it("should overflow limitNotAccredited", async function() {

        });

        it("should overflow limitUS", async function() {

        });

        it("should failed when transfer amount < allowed (transfer)", async function() {
            await truffleAssert.fails(STO.transfer(accounts[0], -1, {from: contractOwner, gasPrice: gasPrice}))
        });

        it("should failed when transfer amount < allowed (transferFrom)", async function() {
       
        });

        it("should failed when transfer from not US to US", async function() {

        });
    });

    describe('INTEGRATION TEST', () => {
        it("should transfer from different accounts", async function() {
            // have to addIdentity for different account and transfer
            let accountsAndOptions = GenerateAccountsList()

            for(let i=0;i<accountsAndOptions.length;i++) {
                await IR.addIdentity(accountsAndOptions[i][0], accountsAndOptions[i][1], accountsAndOptions[i][2], {from: contractOwner});
            }

            // transfer

        });

        it("should transferFrom from different accounts", async function() {
            // have to addIdentity for different account and transfer
             let accountsAndOptions = GenerateAccountsList()

            for(let i=0;i<accountsAndOptions.length;i++) {
                await IR.addIdentity(accountsAndOptions[i][0], accountsAndOptions[i][1], accountsAndOptions[i][2], {from: contractOwner});
            }
            // transferFrom
        });
    });

});


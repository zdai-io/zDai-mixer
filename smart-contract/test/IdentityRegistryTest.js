const IdentityRegistry = artifacts.require("./IdentityRegistry.sol");
const truffleAssert = require('truffle-assertions');

let IR;

const web3 = global.web3;

const tbn = v => web3.utils.toBN(v);
const fbn = v => v.toString();
const tw = v => web3.utils.toWei(v.toString());
const fw = v => web3.utils.fromWei(v.toString());

contract('IdentityRegistry', (accounts) => {

    const contractOwner = accounts[0];

    beforeEach(async function() {
        IR = await IdentityRegistry.new({from: contractOwner});
    });

    describe('COMMON TEST', () => {
        it("should set identity from contract owner", async function() {

            let accountsAndOptions = [[web3.utils.randomHex(20), true, true],
                                  [web3.utils.randomHex(20), true, false],
                                  [web3.utils.randomHex(20), false, false],
                                  [web3.utils.randomHex(20), false, true]];

            for(let i=0;i<accountsAndOptions.length;i++) {
                await IR.addIdentity(accountsAndOptions[i][0], accountsAndOptions[i][1], accountsAndOptions[i][2], {from: contractOwner});
            }

        });

        it("should bind addresses and get identitys", async function() {
          
            const firstAccount  = "0xCc036143C68A7A9a41558Eae739B428eCDe5EF66";
            const firstId = web3.utils.randomHex(20);
           
            const secondAccount = "0xcaeae20d1924cb3c40c253b371d9a8c503faff97";
            const secondId = web3.utils.randomHex(20);
          
            await IR.bindAddress(firstAccount, firstId, {from: contractOwner});
            await IR.bindAddress(secondAccount, secondId, {from: contractOwner});

            let identityOfFirstAccount = await IR.getIdentity(firstAccount);
            let identityOfSecondAccount = await IR.getIdentity(secondAccount);

            assert.equal(firstId,identityOfFirstAccount[0].toLowerCase());
            assert.equal(secondId,identityOfSecondAccount[0].toLowerCase());
       
        });

    });

    describe('NEGATIVE TEST', () => {
        it("should fail when identity is set not from contract owner", async function() {
             await truffleAssert.fails(IR.addIdentity(web3.utils.randomHex(20), true, false, {from: "0x215AF1db51B915AddbaaAC756b871F725Bcc77be"}))
        });

        it("should fail when identity is set using the existing ID", async function() {
            await IR.addIdentity("0x524c994069630a5ddfe0216c571b5c80983d7fcb", true, true, {from: contractOwner})
            await truffleAssert.fails(IR.addIdentity("0x524c994069630a5ddfe0216c571b5c80983d7fcb", true, true, {from: contractOwner}))
        });

        it("should fail when identity is set with unapproptiate arguments", async function() {
            await truffleAssert.fails(IR.addIdentity("0x524c994069630a5ddfe0216c57", true, true, {from: contractOwner}))

            // todo: check 
            // await truffleAssert.fails(IR.addIdentity("0x524c994069630a5ddfe0216c571b5c80983d7fcb", "true", "true", {from: contractOwner}))
            // await truffleAssert.fails(IR.addIdentity("0x524c994069630a5ddfe0216c571b5c80983d7fcb", 1000, 1, {from: contractOwner}))
        });

        it("should fail when bind address is not from contract owner", async function() {
            await truffleAssert.fails(IR.bindAddress("0x524c994069630a5ddfe0216c571b5c80983d7fcb", "0x524c994069630a5ddfe0216c571b5c80983d7fcb", {from: "0x524c994069630a5ddfe0216c571b5c80983d7fcb"}))
        });

        it("should fail when the address is rebind", async function() {
            await IR.bindAddress("0x524c994069630a5ddfe0216c571b5c80983d7fcb", "0x524c994069630a5ddfe0216c571b5c80983d7fcb", {from: accounts[0]})
            await truffleAssert.fails(IR.bindAddress("0x524c994069630a5ddfe0216c571b5c80983d7fcb", "0x524c994069630a5ddfe0216c571b5c80983d7fcb", {from: accounts[0]}))
        });

        it("should fail when address is binded with unapproptiate arguments", async function() {
            await truffleAssert.fails(IR.bindAddress("0x524c994069630a5ddfe0216c571", "0x524c994069630a5ddfe0216c571b5c80983d7fcb", {from: accounts[0]}))
            await truffleAssert.fails(IR.bindAddress("0x524c994069630a5ddfe0216c571b5c80983d7fcb", "0x524c994069630a5ddfe0216c571", {from: accounts[0]}))
            await truffleAssert.fails(IR.bindAddress(true, "0x524c994069630a5ddfe0216c571", {from: accounts[0]}))
            await truffleAssert.fails(IR.bindAddress("0x524c994069630a5ddfe0216c571b5c80983d7fcb", 100, {from: accounts[0]}))
        });

        it("should fail when identity with unapproptiate argument is gotten", async function() {
            await truffleAssert.fails(IR.getIdentity("0x524c994069630a5ddfe0216c571"))
            await truffleAssert.fails(IR.getIdentity(true))
            await truffleAssert.fails(IR.getIdentity(100))
        });

    });

});


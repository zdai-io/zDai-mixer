const ZDai = artifacts.require('ZDai');
const Verifier = artifacts.require('Verifier');



module.exports = async function (deployer, network, accounts) {
    const operator = accounts[0];

    await deployer.deploy(Verifier);
    const verifier = await Verifier.deployed();
    
    await deployer.deploy(ZDai, verifier.address);
    const zDai = await ZDai.deployed();
    console.log(zDai.address);
    // deployer.then(async function () {
    //     let verifier = await Verifier.new();
    //     let registry = await ZDai.new(verifier.address);
    // });

};

const ZDai = artifacts.require('ZDai');
const Verifier = artifacts.require('Verifier');



module.exports = async function (deployer, network, accounts) {
    const operator = accounts[0];
    (async () => {
        deployer.then(async function () {
            let verifier = await Verifier.new();
            let registry = await ZDai.new(verifier.address);
        });
    })();
};

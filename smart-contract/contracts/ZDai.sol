pragma solidity >=0.5.2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract IVerifier {
  function verifyTransaction(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[15] memory input 
    ) public returns(bool);

  function verifyWithdrawal(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[4] memory input 
    ) public returns(bool);

  function verifyDeposit(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[3] memory input 
    ) public returns(bool);
}

contract ZDai {
  using SafeMath for uint;

  mapping(address=>mapping(uint => bool)) public burnedSalt;
  mapping(uint => bool) utxo;

  IVerifier verifier;

  constructor(address _verifier) public {
    for (uint i = 1; i <= 10; i++) {
      utxo[i] = true;
    }
    verifier = IVerifier(_verifier);
  }

  function transaction(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[15] memory input /* owner, in_salt[2], all_in_hashes[10], out_hashes[2] */
  ) public returns(bool) {
    require(address(input[0])==msg.sender);
    require(!burnedSalt[msg.sender][input[1]]);
    require(!burnedSalt[msg.sender][input[2]]);
    for(uint i=3; i<13; i++) {
      require(utxo[input[i]]);
    }
    require(!utxo[input[13]]);
    require(!utxo[input[14]]);
    require(verifier.verifyTransaction(a, b, c, input));

    utxo[input[13]] = true;
    utxo[input[14]] = true;
    burnedSalt[msg.sender][input[1]] = true;
    burnedSalt[msg.sender][input[2]] = true;
    return true;
  }

  function withdrawal(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[4] memory input  /* balance, salt, owner, hash */
  ) public returns(bool) {
    require(!burnedSalt[msg.sender][input[1]]);
    require(address(input[2]) == msg.sender);
    require(utxo[input[3]]);
    require(verifier.verifyWithdrawal(a, b, c, input));
    utxo[input[3]] = false;
    burnedSalt[msg.sender][input[1]] = true;
    msg.sender.transfer(input[0]);
    return true;
  }

  function deposit(
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[3] memory input /* balance, owner, hash */
  ) public payable returns(bool) {
    require(input[0] == msg.value);
    require(address(input[1]) == msg.sender);
    require(!utxo[input[2]]);
    require(verifier.verifyDeposit(a, b, c, input));
    utxo[input[2]] = true;
    return true;
  }

}
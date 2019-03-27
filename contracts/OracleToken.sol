pragma solidity 0.5.2;

import { ERC20 } from "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


contract OracleToken is ERC20 {
    string public name = "Polaris Token";
    string public symbol = "PLRS";
    uint8 public decimals = 18;
    address public oracle;
    address public token;

    constructor(address _token) public payable {
        oracle = msg.sender;
        token = _token;
    }

    function () external payable {}

    function mint(address to, uint amount) public returns (bool) {
        require(msg.sender == oracle, "OracleToken::mint: Only Oracle can call mint");
        _mint(to, amount);
        return true;
    }

    function redeem(uint amount) public {
        uint ethAmount = address(this).balance.mul(amount).div(totalSupply());
        _burn(msg.sender, amount);
        msg.sender.transfer(ethAmount);
    }
}
pragma solidity 0.5.2;

import { ERC20 } from "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {

    event Issue(address token, address to, uint amount);

    function issueTo(address who, uint amount) public {
        _mint(who, amount);
    }

}
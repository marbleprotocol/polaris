pragma solidity 0.5.2;

import { IPokable } from "../interface/IPokable.sol";


contract MockPoker {

    IPokable public oracle;

    constructor(IPokable _oracle) public {
        oracle = _oracle;
    }

    function poke(address token) public {
        oracle.poke(token);
    }
}
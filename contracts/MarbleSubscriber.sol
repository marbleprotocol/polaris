pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import { IPolaris } from "./interface/IPolaris.sol";


contract MarbleSubscriber {

    IPolaris public oracle;

    constructor(address _oracle) public {
        oracle = IPolaris(_oracle);
    }

    function subscribe(address asset) public payable returns (uint) {
        oracle.subscribe.value(msg.value)(asset);
    }

    function getDestAmount(address src, address dest, uint srcAmount) public view returns (uint) {
        return oracle.getDestAmount(src, dest, srcAmount);
    }

    function getMedianizer(address token) public view returns (IPolaris.Medianizer memory) {
        return oracle.getMedianizer(token);
    }
}
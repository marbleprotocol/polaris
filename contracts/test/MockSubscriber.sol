pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import { IPolaris } from "../interface/IPolaris.sol";


contract MockSubscriber {

    IPolaris public oracle;

    constructor(address _oracle) public {
        oracle = IPolaris(_oracle);
    }

    // Accept Ether upon unsubscribe
    function () external payable {}

    function subscribe(address asset) public payable returns (uint) {
        oracle.subscribe.value(msg.value)(asset);
    }

    function unsubscribe(address asset, uint amount) public returns (uint) {
        return oracle.unsubscribe(asset, amount);
    }

    function getDestAmount(address src, address dest, uint srcAmount) public view returns (uint) {
        return oracle.getDestAmount(src, dest, srcAmount);
    }

    function getMedianizer(address token) public view returns (IPolaris.Medianizer memory) {
        return oracle.getMedianizer(token);
    }
}
pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;


contract IPolaris {
    struct Checkpoint {
        uint ethReserve;
        uint tokenReserve;
    }

    struct Medianizer {
        uint8 tail;
        uint pendingStartTimestamp;
        uint latestTimestamp;
        Checkpoint[] prices;
        Checkpoint[] pending;
        Checkpoint median;
    }
    function subscribe(address token) public payable;
    function unsubscribe(address token, uint amount) public returns (uint actualAmount);
    function getMedianizer(address token) public view returns (Medianizer memory);
    function getDestAmount(address src, address dest, uint srcAmount) public view returns (uint);
}
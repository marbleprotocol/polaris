pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import { MockUniswapExchange } from "./MockUniswapExchange.sol";


contract MockUniswapFactory {
    // Public Variables
    address public exchangeTemplate;
    uint256 public tokenCount;

    mapping (address => address) private exchangeToToken;
    mapping (address => address) private tokenToExchange;
    mapping (uint256 => address) private idToToken;

    function createExchange(address token) external returns (address) {
        MockUniswapExchange exchange = new MockUniswapExchange();
        exchange.setup(token);
        tokenToExchange[token] = address(exchange);
        exchangeToToken[address(exchange)] = token;
        uint256 tokenId = tokenCount + 1;
        tokenCount = tokenId;
        idToToken[tokenId] = token;
        return address(exchange);
    }

    function getExchange(address token) external view returns (address) {
        return tokenToExchange[token];
    }

    function getToken(address exchange) external view returns (address) {
        return exchangeToToken[exchange];
    }

    function getTokenWithId(uint256 tokenId) external view returns (address) {
        return idToToken[tokenId];
    }
}
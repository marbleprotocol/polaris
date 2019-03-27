pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import { IERC20 } from "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract MockUniswapExchange {
    using SafeMath for uint;
    
    bytes32 public name;
    bytes32 public symbol;
    uint256 public decimals;
    uint256 public totalSupply;

    uint public valueInEth = 1000000000000000000; // default price 

    mapping (address => uint256) private balances;
    mapping (address => mapping (address => uint256)) private allowances;
    address private token;
    address private factory;

    // Accept Ether
    function () external payable {}

    function setup(address _token) external {
        factory = msg.sender;
        token = _token;
        // name = "0x556e697377617020563100000000000000000000000000000000000000000000";
        // symbol = "0x554e492d56310000000000000000000000000000000000000000000000000000";
        decimals = 18;
    }

    function setValueInEth(uint _valueInEth) external {
        valueInEth = _valueInEth; 
    }

    function removeEth(uint _valueInEth) external {
        msg.sender.transfer(_valueInEth);
    }

    function removeTokens(uint _tokenAmount) external {
        IERC20(token).transfer(msg.sender, _tokenAmount);
    }

    // Address of ERC20 token sold on this exchange
    function tokenAddress() external view returns (address) {
        return token;
    }

    // Address of Uniswap Factory
    function factoryAddress() external view returns (address) {
        return factory;
    }

    // Get Prices
    function getEthToTokenInputPrice(uint256 eth_sold) public view returns (uint256 tokens_bought) {
        return eth_sold.mul(10 ** 18).div(valueInEth);
    }

    function getEthToTokenOutputPrice(uint256 tokens_bought) public view returns (uint256 eth_sold) {
        return tokens_bought.mul(valueInEth).div(10 ** 18);
    }

    function getTokenToEthInputPrice(uint256 tokens_sold) public view returns (uint256 eth_bought) {
        return tokens_sold.mul(valueInEth).div(10 ** 18);
    }

    function getTokenToEthOutputPrice(uint256 eth_bought) public view returns (uint256 tokens_sold) {
        return eth_bought.mul(10 ** 18).div(valueInEth);
    }

    function ethToTokenSwapInput(uint256 min_tokens, uint256 deadline) external payable returns (uint256  tokens_bought) {
        tokens_bought = getEthToTokenInputPrice(msg.value);
        require(tokens_bought >= min_tokens, "MockUniswap::ethToTokenSwapInput: isn't greater than min_tokens");
        IERC20(token).transfer(msg.sender, tokens_bought);

        // Silence compiler warning
        deadline;
    }

    function ethToTokenTransferInput(uint256 min_tokens, uint256 deadline, address payable recipient) external payable returns (uint256  tokens_bought) {
        tokens_bought = getEthToTokenInputPrice(msg.value);
        require(tokens_bought >= min_tokens, "MockUniswap::ethToTokenTransferInput: isn't greater than min_tokens");
        IERC20(token).transfer(recipient, tokens_bought);

        // Silence compiler warning
        deadline;
    }

    function ethToTokenSwapOutput(uint256 tokens_bought, uint256 deadline) external payable returns (uint256  eth_sold) {
        eth_sold = getEthToTokenOutputPrice(tokens_bought);
        require(eth_sold == msg.value, "MockUniswap::ethToTokenSwapOutput: msg.value doesn't equal the eth_sold");
        IERC20(token).transfer(msg.sender, tokens_bought);

        // Silence compiler warning
        deadline;
    }

    function ethToTokenTransferOutput(uint256 tokens_bought, uint256 deadline, address payable recipient) external payable returns (uint256  eth_sold) {
        eth_sold = getEthToTokenOutputPrice(tokens_bought);
        require(eth_sold == msg.value, "MockUniswap::ethToTokenTransferOutput: msg.value doesn't equal the eth_sold");
        IERC20(token).transfer(recipient, tokens_bought);

        // Silence compiler warning
        deadline;
    }

    function tokenToEthSwapInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline) external returns (uint256  eth_bought) {
        eth_bought = getTokenToEthInputPrice(tokens_sold);
        require(eth_bought >= min_eth, "MockUniswap::tokenToEthSwapInput: isn't greater than min_eth");
        IERC20(token).transferFrom(msg.sender, address(this), tokens_sold);
        msg.sender.transfer(eth_bought);

        // Silence compiler warning
        deadline;
    }

    function tokenToEthTransferInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline, address payable recipient) external returns (uint256  eth_bought) {
        eth_bought = getTokenToEthInputPrice(tokens_sold);
        require(eth_bought >= min_eth, "MockUniswap::tokenToEthTransferInput: isn't greater than min_eth");
        IERC20(token).transferFrom(msg.sender, address(this), tokens_sold);
        recipient.transfer(eth_bought);

        // Silence compiler warning
        deadline;
    }

    function tokenToEthSwapOutput(uint256 eth_bought, uint256 max_tokens, uint256 deadline) external returns (uint256  tokens_sold) {
        tokens_sold = getTokenToEthOutputPrice(eth_bought);
        require(tokens_sold <= max_tokens, "MockUniswap::tokenToEthSwapOutput: tokens_sold is greater than max_tokens");
        IERC20(token).transferFrom(msg.sender, address(this), tokens_sold);
        msg.sender.transfer(eth_bought);

        // Silence compiler warning
        deadline;
    }

    function tokenToEthTransferOutput(uint256 eth_bought, uint256 max_tokens, uint256 deadline, address payable recipient) external returns (uint256  tokens_sold) {
        tokens_sold = getTokenToEthOutputPrice(eth_bought);
        require(tokens_sold <= max_tokens, "MockUniswap::tokenToEthTransferOutput: tokens_sold is greater than max_tokens");
        IERC20(token).transferFrom(msg.sender, address(this), tokens_sold);
        recipient.transfer(eth_bought);

        // Silence compiler warning
        deadline;
    }
}
pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import { IERC20 } from "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import { Math } from "openzeppelin-solidity/contracts/math/Math.sol";
import { SafeMath } from "openzeppelin-solidity/contracts/math/SafeMath.sol";

import { IUniswapExchange } from "./interface/IUniswapExchange.sol";
import { IUniswapFactory } from "./interface/IUniswapFactory.sol";

import { OracleToken } from "./OracleToken.sol";


contract Polaris {
    using Math for uint;
    using SafeMath for uint;

    event NewMedian(address indexed token, uint ethReserve, uint tokenReserve);
    event Subscribe(address indexed token, address indexed subscriber, uint amount);
    event Unsubscribe(address indexed token, address indexed subscriber, uint amount);

    uint8 public constant MAX_CHECKPOINTS = 15;

    // Reward for a successful poke, in oracle tokens
    uint public constant CHECKPOINT_REWARD = 1e18;

    // Conditions for checkpoint reward
    uint public constant MIN_PRICE_CHANGE = .01e18; // 1%
    uint public constant MAX_TIME_SINCE_LAST_CHECKPOINT = 3 hours;

    uint public constant PENDING_PERIOD = 3.5 minutes;

    address public constant ETHER = address(0);

    // Monthly subscription fee to subscribe to a single oracle
    uint public constant MONTHLY_SUBSCRIPTION_FEE = 5 ether;
    uint public constant ONE_MONTH_IN_SECONDS = 30 days;

    IUniswapFactory public uniswap;

    struct Account {
        uint balance;
        uint collectionTimestamp;
    }

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

    // Token => Subscriber => Account
    mapping (address => mapping (address => Account)) public accounts;

    // Token => Oracle Token (reward for poking)
    mapping (address => OracleToken) public oracleTokens;

    // Token => Medianizer
    mapping (address => Medianizer) private medianizers;

    constructor(IUniswapFactory _uniswap) public {
        uniswap = _uniswap;
    }

    /**
     * @dev Subscribe to read the price of a given token (e.g, DAI).
     * @param token The address of the token to subscribe to.
     */
    function subscribe(address token) public payable {
        Account storage account = accounts[token][msg.sender];
        _collect(token, account);
        account.balance = account.balance.add(msg.value);
        require(account.balance >= MONTHLY_SUBSCRIPTION_FEE, "Polaris::subscribe: Account balance is below the minimum");
        emit Subscribe(token, msg.sender, msg.value);
    }

    /**
     * @dev Unsubscribe to a given token (e.g, DAI).
     * @param token The address of the token to unsubscribe from.
     * @param amount The requested amount to withdraw, in wei.
     * @return The actual amount withdrawn, in wei.
     */
    function unsubscribe(address token, uint amount) public returns (uint) {
        Account storage account = accounts[token][msg.sender];
        _collect(token, account);
        uint maxWithdrawAmount = account.balance.sub(MONTHLY_SUBSCRIPTION_FEE);
        uint actualWithdrawAmount = amount.min(maxWithdrawAmount);
        account.balance = account.balance.sub(actualWithdrawAmount);
        msg.sender.transfer(actualWithdrawAmount);
        emit Unsubscribe(token, msg.sender, actualWithdrawAmount);
    }

    /**
     * @dev Collect subscription fees from a subscriber.
     * @param token The address of the subscribed token to collect fees from.
     * @param who The address of the subscriber.
     */
    function collect(address token, address who) public {
        Account storage account = accounts[token][who];
        _collect(token, account);
    }

    /**
     * @dev Add a new price checkpoint.
     * @param token The address of the token to checkpoint.
     */
    function poke(address token) public {
        require(_isHuman(), "Polaris::poke: Poke must be called by an externally owned account");
        OracleToken oracleToken = oracleTokens[token];

        // Get the current reserves from Uniswap
        Checkpoint memory checkpoint = _newCheckpoint(token);

        if (address(oracleToken) == address(0)) {
            _initializeMedianizer(token, checkpoint);
        } else {
            Medianizer storage medianizer = medianizers[token];

            require(medianizer.latestTimestamp != block.timestamp, "Polaris::poke: Cannot poke more than once per block");

            // See if checkpoint should be rewarded
            if (_willRewardCheckpoint(token, checkpoint)) {
                oracleToken.mint(msg.sender, CHECKPOINT_REWARD);
            }

            // If pending checkpoints are old, reset pending checkpoints
            if (block.timestamp.sub(medianizer.pendingStartTimestamp) > PENDING_PERIOD || medianizer.pending.length == MAX_CHECKPOINTS) {
                medianizer.pending.length = 0;
                medianizer.tail = (medianizer.tail + 1) % MAX_CHECKPOINTS;
                medianizer.pendingStartTimestamp = block.timestamp;
            }

            medianizer.latestTimestamp = block.timestamp;

            // Add the checkpoint to the pending array
            medianizer.pending.push(checkpoint);
            
            // Add the pending median to the prices array
            medianizer.prices[medianizer.tail] = _medianize(medianizer.pending);
            
            // Find and store the prices median
            medianizer.median = _medianize(medianizer.prices);

            emit NewMedian(token, medianizer.median.ethReserve, medianizer.median.tokenReserve);
        }
    }

    /**
     * @dev Get price data for a given token.
     * @param token The address of the token to query.
     * @return The price data struct.
     */
    function getMedianizer(address token) public view returns (Medianizer memory) {
        require(_isSubscriber(accounts[token][msg.sender]) || _isHuman(), "Polaris::getMedianizer: Not subscribed");
        return medianizers[token];
    }

    /**
     * @notice This uses the x * y = k bonding curve to determine the destination amount based on the medianized price.
     *              𝝙x = (𝝙y * x) / (y + 𝝙y)
     * @dev Get the amount of destination token, based on a given amount of source token.
     * @param src The address of the source token.
     * @param dest The address of the destination token.
     * @param srcAmount The amount of the source token.
     * @return The amount of destination token.
     */
    function getDestAmount(address src, address dest, uint srcAmount) public view returns (uint) {
        if (!_isHuman()) {
            require(src == ETHER || _isSubscriber(accounts[src][msg.sender]), "Polaris::getDestAmount: Not subscribed");
            require(dest == ETHER || _isSubscriber(accounts[dest][msg.sender]), "Polaris::getDestAmount: Not subscribed");    
        }

        if (src == dest) {
            return srcAmount;
        } else if (src == ETHER) {
            Checkpoint memory median = medianizers[dest].median;
            return srcAmount.mul(median.tokenReserve).div(median.ethReserve.add(srcAmount));
        } else if (dest == ETHER) {
            Checkpoint memory median = medianizers[src].median;
            return srcAmount.mul(median.ethReserve).div(median.tokenReserve.add(srcAmount));
        } else {
            Checkpoint memory srcMedian = medianizers[src].median;
            Checkpoint memory destMedian = medianizers[dest].median;
            
            uint ethAmount = srcAmount.mul(srcMedian.ethReserve).div(srcMedian.tokenReserve.add(srcAmount));
            return ethAmount.mul(destMedian.ethReserve).div(destMedian.tokenReserve.add(ethAmount));
        }
    }

    /**
     * @dev Determine whether a given checkpoint would be rewarded with newly minted oracle tokens.
     * @param token The address of the token to query checkpoint for.
     * @return True if given checkpoint satisfies any of the following:
     *              Less than required checkpoints exist to calculate a valid median
     *              Exceeds max time since last checkpoint
     *              Exceeds minimum price change from median AND no pending checkpoints
     *              Exceeds minimum percent change from pending checkpoints median
     *              Exceeds minimum percent change from last checkpoint
     */
    function willRewardCheckpoint(address token) public view returns (bool) {
        Checkpoint memory checkpoint = _newCheckpoint(token);
        return _willRewardCheckpoint(token, checkpoint);
    }

    /**
     * @dev Get the account for a given subscriber of a token feed.
     * @param token The token to query the account of the given subscriber.
     * @param who The subscriber to query the account of the given token feed.
     * @return The account of the subscriber of the given token feed.
     */
    function getAccount(address token, address who) public view returns (Account memory) {
        return accounts[token][who];
    }

    /**
     * @dev Get the owed amount for a given subscriber of a token feed.
     * @param token The token to query the owed amount of the given subscriber.
     * @param who The subscriber to query the owed amount for the given token feed.
     * @return The owed amount of the subscriber of the given token feed.
     */
    function getOwedAmount(address token, address who) public view returns (uint) {
        Account storage account = accounts[token][who];
        return _getOwedAmount(account);
    }

    /**
     * @dev Update the subscriber balance of a given token feed.
     * @param token The token to collect subscription revenues for.
     * @param account The subscriber account to collect subscription revenues from.
     */
    function _collect(address token, Account storage account) internal {
        if (account.balance == 0) {
            account.collectionTimestamp = block.timestamp;
            return;
        }

        uint owedAmount = _getOwedAmount(account);
        OracleToken oracleToken = oracleTokens[token];

        // If the subscriber does not have enough, collect the remaining balance
        if (owedAmount >= account.balance) {
            address(oracleToken).transfer(account.balance);
            account.balance = 0;
        } else {
            address(oracleToken).transfer(owedAmount);
            account.balance = account.balance.sub(owedAmount);
        }

        account.collectionTimestamp = block.timestamp;
    }

    /**
     * @dev Initialize the medianizer
     * @param token The token to initialize the medianizer for.
     * @param checkpoint The new checkpoint to initialize the medianizer with.
     */
    function _initializeMedianizer(address token, Checkpoint memory checkpoint) internal {
        address payable exchange = uniswap.getExchange(token);
        require(exchange != address(0), "Polaris::_initializeMedianizer: Token must exist on Uniswap");

        OracleToken oracleToken = new OracleToken(token);
        oracleTokens[token] = oracleToken;
        // Reward additional oracle tokens for the first poke to compensate for extra gas costs
        oracleToken.mint(msg.sender, CHECKPOINT_REWARD.mul(10));

        Medianizer storage medianizer = medianizers[token];
        medianizer.pending.push(checkpoint);
        medianizer.median = checkpoint;
        medianizer.latestTimestamp = block.timestamp;
        medianizer.pendingStartTimestamp = block.timestamp;

        // Hydrate prices queue
        for (uint i = 0; i < MAX_CHECKPOINTS; i++) {
            medianizer.prices.push(checkpoint);
        }
    }

    /**
     * @dev Find the median given an array of checkpoints.
     * @param checkpoints The array of checkpoints to find the median.
     * @return The median checkpoint within the given array.
     */
    function _medianize(Checkpoint[] memory checkpoints) internal pure returns (Checkpoint memory) {
        // To minimize complexity, return the higher of the two middle checkpoints in even-sized arrays instead of the average.
        uint k = checkpoints.length.div(2); 
        uint left = 0;
        uint right = checkpoints.length.sub(1);

        while (left < right) {
            uint pivotIndex = left.add(right).div(2);
            Checkpoint memory pivotCheckpoint = checkpoints[pivotIndex];

            (checkpoints[pivotIndex], checkpoints[right]) = (checkpoints[right], checkpoints[pivotIndex]);
            uint storeIndex = left;
            for (uint i = left; i < right; i++) {
                if (_isLessThan(checkpoints[i], pivotCheckpoint)) {
                    (checkpoints[storeIndex], checkpoints[i]) = (checkpoints[i], checkpoints[storeIndex]);
                    storeIndex++;
                }
            }

            (checkpoints[storeIndex], checkpoints[right]) = (checkpoints[right], checkpoints[storeIndex]);
            if (storeIndex < k) {
                left = storeIndex.add(1);
            } else {
                right = storeIndex;
            }
        }

        return checkpoints[k];
    }

    /**
     * @dev Determine if checkpoint x is less than checkpoint y.
     * @param x The first checkpoint for comparison.
     * @param y The second checkpoint for comparison.
     * @return True if x is less than y.
     */
    function _isLessThan(Checkpoint memory x, Checkpoint memory y) internal pure returns (bool) {
        return x.ethReserve.mul(y.tokenReserve) < y.ethReserve.mul(x.tokenReserve);
    }

    /**
     * @dev Check if msg.sender is an externally owned account.
     * @return True if msg.sender is an externally owned account, false if smart contract.
     */
    function _isHuman() internal view returns (bool) {
        return msg.sender == tx.origin;
    }

    /**
     * @dev Get the reserve values of a Uniswap exchange for a given token.
     * @param token The token to query the reserve values for.
     * @return A checkpoint holding the appropriate reserve values.
     */
    function _newCheckpoint(address token) internal view returns (Checkpoint memory) {
        address payable exchange = uniswap.getExchange(token);
        return Checkpoint({
            ethReserve: exchange.balance,
            tokenReserve: IERC20(token).balanceOf(exchange)
        });
    }

    /**
     * @dev Get subscriber status of a given account for a given token.
     * @param account The account to query.
     * @return True if subscribed.
     */
    function _isSubscriber(Account storage account) internal view returns (bool) {
        // Strict inequality to return false for users who never subscribed and owe zero.      
        return account.balance > _getOwedAmount(account);
    }

    /**
     * @dev Get amount owed by an account. Accrued amount minus collections.
     * @param account The account to query.
     * @return Amount owed.
     */
    function _getOwedAmount(Account storage account) internal view returns (uint) {
        if (account.collectionTimestamp == 0) return 0;

        uint timeElapsed = block.timestamp.sub(account.collectionTimestamp);
        return MONTHLY_SUBSCRIPTION_FEE.mul(timeElapsed).div(ONE_MONTH_IN_SECONDS);
    }

    /**
     * @dev Determine whether a given checkpoint would be rewarded with newly minted oracle tokens.
     * @param token The address of the token to query checkpoint for.
     * @param checkpoint The checkpoint to test for reward of oracle tokens.
     * @return True if given checkpoint satisfies any of the following:
     *              Less than required checkpoints exist to calculate a valid median
     *              Exceeds max time since last checkpoint
     *              Exceeds minimum price change from median AND no pending checkpoints
     *              Exceeds minimum percent change from pending checkpoints median
     *              Exceeds minimum percent change from last checkpoint
     */
    function _willRewardCheckpoint(address token, Checkpoint memory checkpoint) internal view returns (bool) {
        Medianizer memory medianizer = medianizers[token];

        return (
            medianizer.prices.length < MAX_CHECKPOINTS ||
            block.timestamp.sub(medianizer.latestTimestamp) >= MAX_TIME_SINCE_LAST_CHECKPOINT ||
            (block.timestamp.sub(medianizer.pendingStartTimestamp) >= PENDING_PERIOD && _percentChange(medianizer.median, checkpoint) >= MIN_PRICE_CHANGE) ||
            _percentChange(medianizer.prices[medianizer.tail], checkpoint) >= MIN_PRICE_CHANGE ||
            _percentChange(medianizer.pending[medianizer.pending.length.sub(1)], checkpoint) >= MIN_PRICE_CHANGE
        );
    }

    /**
     * @dev Get the percent change between two checkpoints.
     * @param x The first checkpoint.
     * @param y The second checkpoint.
     * @return The absolute value of the percent change, with 18 decimals of precision (e.g., .01e18 = 1%).
     */
    function _percentChange(Checkpoint memory x, Checkpoint memory y) internal pure returns (uint) {
        uint a = x.ethReserve.mul(y.tokenReserve);
        uint b = y.ethReserve.mul(x.tokenReserve);
        uint diff = a > b ? a.sub(b) : b.sub(a);
        return diff.mul(10 ** 18).div(a);
    }

}
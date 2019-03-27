[![CircleCI](https://circleci.com/gh/marbleprotocol/polaris/tree/master.svg?style=svg)](https://circleci.com/gh/marbleprotocol/polaris/tree/master)

# ✨ Polaris

Polaris is an on-chain decentralized price oracle for ERC20 tokens. It calculates the median of historical checkpoints on Uniswap for a price that is both accurate and resistant to manipulation.

Polaris.sol: [0x440a803b42a78d93a1fe5da29a9fb37ecf193786](https://etherscan.io/address/0x440a803b42a78d93a1fe5da29a9fb37ecf193786)
```
[{"constant":true,"inputs":[],"name":"MONTHLY_SUBSCRIPTION_FEE","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"}],"name":"willRewardCheckpoint","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MAX_TIME_SINCE_LAST_CHECKPOINT","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"uniswap","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"}],"name":"getMedianizer","outputs":[{"components":[{"name":"tail","type":"uint8"},{"name":"pendingStartTimestamp","type":"uint256"},{"name":"latestTimestamp","type":"uint256"},{"components":[{"name":"ethReserve","type":"uint256"},{"name":"tokenReserve","type":"uint256"}],"name":"prices","type":"tuple[]"},{"components":[{"name":"ethReserve","type":"uint256"},{"name":"tokenReserve","type":"uint256"}],"name":"pending","type":"tuple[]"},{"components":[{"name":"ethReserve","type":"uint256"},{"name":"tokenReserve","type":"uint256"}],"name":"median","type":"tuple"}],"name":"","type":"tuple"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"token","type":"address"}],"name":"subscribe","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"ETHER","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MAX_CHECKPOINTS","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"ONE_MONTH_IN_SECONDS","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"CHECKPOINT_REWARD","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"oracleTokens","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"token","type":"address"},{"name":"amount","type":"uint256"}],"name":"unsubscribe","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"token","type":"address"},{"name":"who","type":"address"}],"name":"collect","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"},{"name":"who","type":"address"}],"name":"getOwedAmount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"accounts","outputs":[{"name":"balance","type":"uint256"},{"name":"collectionTimestamp","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"token","type":"address"}],"name":"poke","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"MIN_PRICE_CHANGE","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"src","type":"address"},{"name":"dest","type":"address"},{"name":"srcAmount","type":"uint256"}],"name":"getDestAmount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"token","type":"address"},{"name":"who","type":"address"}],"name":"getAccount","outputs":[{"components":[{"name":"balance","type":"uint256"},{"name":"collectionTimestamp","type":"uint256"}],"name":"","type":"tuple"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PENDING_PERIOD","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_uniswap","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"token","type":"address"},{"indexed":false,"name":"ethReserve","type":"uint256"},{"indexed":false,"name":"tokenReserve","type":"uint256"}],"name":"NewMedian","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"token","type":"address"},{"indexed":true,"name":"subscriber","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"Subscribe","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"token","type":"address"},{"indexed":true,"name":"subscriber","type":"address"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"Unsubscribe","type":"event"}]
```

MarbleSubscriber.sol: [0xf25acad904cb436bc3f970fc0a05ede486430cc9](https://etherscan.io/address/0xf25acad904cb436bc3f970fc0a05ede486430cc9)
```
[{"constant":true,"inputs":[{"name":"token","type":"address"}],"name":"getMedianizer","outputs":[{"components":[{"name":"tail","type":"uint8"},{"name":"pendingStartTimestamp","type":"uint256"},{"name":"latestTimestamp","type":"uint256"},{"components":[{"name":"ethReserve","type":"uint256"},{"name":"tokenReserve","type":"uint256"}],"name":"prices","type":"tuple[]"},{"components":[{"name":"ethReserve","type":"uint256"},{"name":"tokenReserve","type":"uint256"}],"name":"pending","type":"tuple[]"},{"components":[{"name":"ethReserve","type":"uint256"},{"name":"tokenReserve","type":"uint256"}],"name":"median","type":"tuple"}],"name":"","type":"tuple"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"asset","type":"address"}],"name":"subscribe","outputs":[{"name":"","type":"uint256"}],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[],"name":"oracle","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"src","type":"address"},{"name":"dest","type":"address"},{"name":"srcAmount","type":"uint256"}],"name":"getDestAmount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"name":"_oracle","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"}]
```

### Incentives

 * Earn a reward by calling `poke` on the price oracle when one of the following is true:
     * The current price is >1% different from the median price
     * The current price is >1% different from the median of pokes in the last 3 minutes
     * The current price is >1% different from the last poke
     * It has been >3 hours since the last price checkpoint
 * A valid poke mints one oracle token to the poker. Each underlying token (e.g., DAI) has a corresponding oracle token.
 * Smart contract protocols must subscribe to read prices from the price oracle. The monthly subscription fee is 5 ether per token. Marble will launch the first paying subscriber for the ETH-DAI price oracle.
 * Burn oracle tokens to collect subscription fees.

### Install dependencies
```
yarn
```

### Compile smart contracts
```
yarn compile
```

### Run tests
```
yarn test
```

### Compile and test
```
yarn rebuild_and_test
```

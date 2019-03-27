import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { devConstants } from '@marbleprotocol/dev-utils';
import * as ethUtil from 'ethereumjs-util';
import * as _ from 'lodash';

const TESTRPC_PRIVATE_KEYS_STRINGS = [
  '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d',
  '0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72',
  '0xdf02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1',
  '0xff12e391b79415e941a94de3bf3a9aee577aed0731e297d5cfa0b8a1e02fa1d0',
  '0x752dd9cf65e68cfaba7d60225cbdbc1f4729dd5e5507def72815ed0d8abc6249',
  '0xefb595a0178eb79a8df953f87c5148402a224cdf725e88c0146727c6aceadccd',
  '0x83c6d2cc5ddcf9711a6d59b417dc20eb48afd58d45290099e5987e3d768f328f',
  '0xbb2d3f7c9583780a7d3904a2f55d792707c345f21de1bacb2d389934d82796b2',
  '0xb2fd4d29c1390b71b8795ae81196bfd60293adf99f9d32a0aff06288fcdac55f',
  '0x23cb7121166b9a2f93ae0b7c05bde02eae50d64449b2cbb42bc84e9d38d6cc89'
];

const port = 8545;

export const AWAIT_TRANSACTION_MINED_MS = 0;
export const BASE_16 = 16;
export const DEFAULT_SALT = new BigNumber(420);
export const INVALID_OPCODE = 'invalid opcode';
export const EVM_REVERT = 'revert';
export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';
export const EXAMPLE_BYTES_1 = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const EXAMPLE_BYTES_2 = '0x0000000000000000000000000000000000000000000000000000000000000001';
export const UNLIMITED_ALLOWANCE_IN_BASE_UNITS = new BigNumber(2).pow(256).minus(1);
export const TESTRPC_PRIVATE_KEYS = _.map(TESTRPC_PRIVATE_KEYS_STRINGS, privateKeyString =>
  ethUtil.toBuffer(privateKeyString)
);
export const INITIAL_ERC20_BALANCE = Web3Wrapper.toBaseUnitAmount(new BigNumber(10000), 18);
export const INITIAL_ERC20_ALLOWANCE = Web3Wrapper.toBaseUnitAmount(new BigNumber(10000), 18);
export const STATIC_ORDER_PARAMS = {
  makerAssetAmount: Web3Wrapper.toBaseUnitAmount(new BigNumber(100), 18),
  takerAssetAmount: Web3Wrapper.toBaseUnitAmount(new BigNumber(200), 18),
  makerFee: Web3Wrapper.toBaseUnitAmount(new BigNumber(1), 18),
  takerFee: Web3Wrapper.toBaseUnitAmount(new BigNumber(1), 18)
};
export const ZERO_AMOUNT = new BigNumber(0);
export const PERCENTAGE_DENOMINATOR = new BigNumber(10).pow(18);
export const ONE_ETH_IN_WEI = new BigNumber(10).pow(18);
export const ONE_WEI = new BigNumber(1);
export const ONE_HOUR_IN_SECONDS = new BigNumber(60 * 60);
export const ONE_DAY_IN_SECONDS = new BigNumber(24 * 60 * 60);
export const ONE_MONTH_IN_SECONDS = new BigNumber(30 * 24 * 60 * 60);
export const ONE_YEAR_IN_SECONDS = new BigNumber(365 * 24 * 60 * 60);
export const MAX_UINT = new BigNumber(
  '115792089237316195423570985008687907853269984665640564039457584007913129639935'
);
export const RPC_URL = `http://localhost:${port}`;
export const GAS_LIMIT = 8000000;
export const RPC_PORT = port;
export const NETWORK_ID = 50;
export const INFURA_MAINNET = 'https://mainnet.infura.io/';
export const BLOCK_NUMBER = 6000000;
export const MNEMONIC =
  'concert load couple harbor equip island argue ramp clarify fence smart topic';
export const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
export const DAI_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';
export const MANA_ADDRESS = '0x0f5d2fb29fb7d3cfee444a200298f468908cc942';
export const KYBER_ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
export const KYBER_EXCHANGE_ADDRESS = '0x91a502C678605fbCe581eae053319747482276b9';
export const POINT_ZERO_ONE_PERCENT_MARGIN = new BigNumber(0.0001); // 0.01%
export const BORROW_AMOUNT = new BigNumber('1e18');
export const DEPOSIT_AMOUNT = BORROW_AMOUNT.times(5);
export const WITHDRAW_AMOUNT = BORROW_AMOUNT.times(3);
export const COLLATERAL_RATIO = new BigNumber(1.5);
export const COLLATERAL_AMOUNT = BORROW_AMOUNT.times(COLLATERAL_RATIO);
export const BASIS_POINTS = new BigNumber(10000);
export const RESERVE_RATIO = BASIS_POINTS.div(5);
export const ONE_QUARTER_PERCENT_INTEREST_RATE = new BigNumber(25);
export const TWO_PERCENT_INTEREST_RATE = new BigNumber('2e16');
export const FIVE_PERCENT_INTEREST_RATE = new BigNumber('5e16');
export const ONE_HUNDRED_PERCENT_INTEREST_RATE = new BigNumber('1e18');
export const ASSET_PRICE = new BigNumber('1000000000000000000');
export const JANUARY_1_2020 = new BigNumber('1577836800');
export const JANUARY_1_2025 = new BigNumber('1735689600');
export const TX_DEFAULTS = {
  from: devConstants.TESTRPC_FIRST_ADDRESS,
  gas: GAS_LIMIT
};
export const EMPTY_DATA = '0x';

import { BigNumber } from '@0x/utils';

import {
  MockSubscriberContract,
  MockUniswapFactoryContract,
  MockERC20Contract,
  PolarisContract
} from '../../build/wrappers';

export interface Account {
  balance: BigNumber;
  lastPaymentTimestamp: BigNumber;
}

export interface Checkpoint {
  ethReserve: BigNumber;
  tokenReserve: BigNumber;
}

export interface CheckpointData {
  tail: number;
  medianEthReserve: BigNumber;
  medianTokenReserve: BigNumber;
  minMaxHeap: number[];
  pokeQueue: Checkpoint[];
}

export interface PriceOracleProtocol {
  addresses: string[];
  borrowERC20: MockERC20Contract;
  collateralERC20: MockERC20Contract;
  poker: string;
  polaris: PolarisContract;
  subscriber: MockSubscriberContract;
  uniswapFactory: MockUniswapFactoryContract;
}

import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Provider, TxData } from 'ethereum-types';
import { PriceOracleProtocol } from './types';

import {
  MockSubscriberContract,
  MockUniswapFactoryContract,
  MockERC20Contract,
  PolarisContract
} from '../../build/wrappers';

export const deployMockERC20 = async (
  unsiwapFactory: MockUniswapFactoryContract,
  provider: Provider,
  txDefaults: Partial<TxData>
) => {
  const token = await MockERC20Contract.deployAsync(provider, txDefaults);
  await unsiwapFactory.createExchange.sendTransactionAsync(token.address);
  const exchangeAddress = await unsiwapFactory.getExchange.callAsync(token.address);

  await token.issueTo.sendTransactionAsync(
    exchangeAddress,
    new BigNumber(100000000000000000000000000000)
  );

  const web3Wrapper = new Web3Wrapper(provider);
  const addresses = await web3Wrapper.getAvailableAddressesAsync();

  await web3Wrapper.sendTransactionAsync({
    from: addresses[addresses.length - 1],
    value: Web3Wrapper.toWei(new BigNumber(99)),
    to: exchangeAddress
  });

  return token;
};

export async function deployPriceOracle(
  provider: Provider,
  txDefaults: Partial<TxData>
): Promise<PriceOracleProtocol> {
  const web3Wrapper = new Web3Wrapper(provider);
  const addresses = await web3Wrapper.getAvailableAddressesAsync();
  const [, poker] = addresses;

  const uniswapFactory = await MockUniswapFactoryContract.deployAsync(provider, txDefaults);

  const borrowERC20 = await deployMockERC20(uniswapFactory, provider, txDefaults);
  const collateralERC20 = await deployMockERC20(uniswapFactory, provider, txDefaults);

  const polaris = await PolarisContract.deployAsync(provider, txDefaults, uniswapFactory.address);

  const subscriber = await MockSubscriberContract.deployAsync(
    provider,
    txDefaults,
    polaris.address
  );

  return {
    addresses,
    borrowERC20,
    collateralERC20,
    poker,
    uniswapFactory,
    polaris,
    subscriber
  };
}

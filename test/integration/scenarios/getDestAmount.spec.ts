import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Provider } from 'ethereum-types';
import * as _ from 'lodash';

import { chai } from '../../utils/chai_setup';
import { ETH_ADDRESS, ONE_ETH_IN_WEI, TX_DEFAULTS, ZERO_AMOUNT } from '../../utils/constants';
import { Checkpoint } from '../../utils/types';

import {
  MockUniswapExchangeContract,
  MockUniswapFactoryContract,
  MockERC20Contract,
  PolarisContract
} from '../../../build/wrappers';

const { expect } = chai;

export function getDestAmountTests(snapshotBlockchain: () => void) {
  describe('#getDestAmount', async () => {
    let borrowERC20: MockERC20Contract;
    let borrowExchange: MockUniswapExchangeContract;
    let uniswapFactory: MockUniswapFactoryContract;
    let polaris: PolarisContract;

    let addresses: string[];

    let timestampIncrease: number;

    let web3Wrapper: Web3Wrapper;
    let provider: Provider;

    let maxCheckpoints: number;

    snapshotBlockchain();

    before(async function() {
      ({ addresses, borrowERC20, uniswapFactory, polaris } = this.protocol);

      provider = this.provider;
      web3Wrapper = new Web3Wrapper(provider);

      const pendingPeriod = await polaris.PENDING_PERIOD.callAsync();
      timestampIncrease = +pendingPeriod.plus(1);

      maxCheckpoints = await polaris.MAX_CHECKPOINTS.callAsync();

      const borrowExchangeAddress = await uniswapFactory.getExchange.callAsync(borrowERC20.address);
      borrowExchange = MockUniswapExchangeContract.new(
        borrowExchangeAddress,
        provider,
        TX_DEFAULTS
      );
    });

    it('should return the correct value from getDestAmount for checkpointing greater than MAX_CHECKPOINTS', async () => {
      const maxRandomNumber = ONE_ETH_IN_WEI.mul(99);
      const minRandomNumber = ONE_ETH_IN_WEI.mul(80);
      const prices = getRandomCheckpointArray(maxCheckpoints, maxRandomNumber, minRandomNumber);

      const jsMedian = getDestAmount(prices, ETH_ADDRESS, ONE_ETH_IN_WEI);

      const gasSum = await setExchangeValuesAndPoke(
        web3Wrapper,
        polaris,
        borrowExchange,
        borrowERC20,
        addresses,
        prices,
        timestampIncrease
      );
      const gasAverage = gasSum.div(prices.length).toFixed(0);
      console.log('GAS AVERAGE:  ', gasAverage);

      const median = await polaris.getDestAmount.callAsync(
        ETH_ADDRESS,
        borrowERC20.address,
        ONE_ETH_IN_WEI
      );
      expect(median).to.be.bignumber.equal(jsMedian);
    });

    it('should return the correct value from getDestAmount for checkpointing less than MAX_CHECKPOINTS', async () => {
      const maxRandomNumber = ONE_ETH_IN_WEI.mul(99);
      const minRandomNumber = ONE_ETH_IN_WEI.mul(80);
      const array1 = getRandomCheckpointArray(maxCheckpoints, maxRandomNumber, minRandomNumber);
      const array2 = getRandomCheckpointArray(2, maxRandomNumber, minRandomNumber);
      const [, ...subArray1] = array1;
      const array = [...subArray1, getMedianCheckpoint(array2)];
      const numberOfCheckpoints = array1.length + array2.length;

      const jsMedian = getDestAmount(array, ETH_ADDRESS, ONE_ETH_IN_WEI);
      let gasSum = await setExchangeValuesAndPoke(
        web3Wrapper,
        polaris,
        borrowExchange,
        borrowERC20,
        addresses,
        array1,
        timestampIncrease
      );

      await web3Wrapper.increaseTimeAsync(timestampIncrease);
      await web3Wrapper.mineBlockAsync();

      gasSum = gasSum.plus(
        await setExchangeValuesAndPoke(
          web3Wrapper,
          polaris,
          borrowExchange,
          borrowERC20,
          addresses,
          array2
        )
      );
      const gasAverage = gasSum.div(numberOfCheckpoints).toFixed(0);
      console.log('GAS AVERAGE:  ', gasAverage);

      const median = await polaris.getDestAmount.callAsync(
        ETH_ADDRESS,
        borrowERC20.address,
        ONE_ETH_IN_WEI
      );
      expect(median).to.be.bignumber.equal(jsMedian);
    });
  });
}

async function setExchangeValuesAndPoke(
  web3Wrapper: Web3Wrapper,
  oracle: PolarisContract,
  exchange: MockUniswapExchangeContract,
  token: MockERC20Contract,
  addresses: string[],
  arr: Checkpoint[],
  timeBetweenCheckpoints: number = 1
) {
  return arr.reduce(async (previous: Promise<BigNumber>, element: Checkpoint, index: number) => {
    const previousSum = await previous;

    await web3Wrapper.increaseTimeAsync(timeBetweenCheckpoints);
    await web3Wrapper.mineBlockAsync();

    const currentEthInReserve = await web3Wrapper.getBalanceInWeiAsync(exchange.address);
    const currentTokensInReserve = await token.balanceOf.callAsync(exchange.address);

    const differenceInEth = element.ethReserve.sub(currentEthInReserve);
    const differenceInTokens = element.tokenReserve.sub(currentTokensInReserve);

    if (differenceInEth.lessThan(ZERO_AMOUNT)) {
      await exchange.removeEth.sendTransactionAsync(differenceInEth.abs());
    } else if (differenceInEth.greaterThan(ZERO_AMOUNT)) {
      const address = await _.find(addresses, async function(a) {
        const balance = await web3Wrapper.getBalanceInWeiAsync(a);
        return balance.greaterThan(differenceInEth);
      });

      if (!_.isUndefined(address)) {
        await web3Wrapper.sendTransactionAsync({
          from: address as string,
          value: differenceInEth,
          to: exchange.address
        });
      } else {
        throw new Error('None of the addresses have enough ETH');
      }
    }

    if (differenceInTokens.lessThan(ZERO_AMOUNT)) {
      await exchange.removeTokens.sendTransactionAsync(differenceInTokens.abs());
    } else if (differenceInTokens.greaterThan(ZERO_AMOUNT)) {
      await token.issueTo.sendTransactionAsync(exchange.address, differenceInTokens);
    }

    const txHash = await oracle.poke.sendTransactionAsync(token.address);
    const txReceipt = await web3Wrapper.awaitTransactionSuccessAsync(txHash);
    console.log(
      `${index + 1} -  GAS USED FOR POKE: ${txReceipt.gasUsed} -- BLOCK NUMBER: ${
        txReceipt.blockNumber
      }`
    );
    return previousSum.add(txReceipt.gasUsed);
  }, Promise.resolve(ZERO_AMOUNT));
}

function getMedianCheckpoint(arr: Checkpoint[]): Checkpoint {
  const index = Math.floor(arr.length / 2);

  const sortedArray = _.sortBy(arr, [
    (x: Checkpoint) => x.ethReserve.div(x.tokenReserve).toNumber()
  ]);

  return {
    ethReserve: sortedArray[index].ethReserve,
    tokenReserve: sortedArray[index].tokenReserve
  };
}

function getDestAmount(arr: Checkpoint[], src: string, srcAmount: BigNumber) {
  const medianCheckpoint = getMedianCheckpoint(arr);

  if (src == ETH_ADDRESS) {
    return new BigNumber(
      srcAmount
        .mul(medianCheckpoint.tokenReserve)
        .div(medianCheckpoint.ethReserve.add(srcAmount))
        .toFixed(0, BigNumber.ROUND_FLOOR)
    );
  } else {
    return new BigNumber(
      srcAmount
        .mul(medianCheckpoint.ethReserve)
        .div(medianCheckpoint.tokenReserve.add(srcAmount))
        .toFixed(0)
    );
  }
}

function getRandomCheckpointArray(size: number, max: BigNumber, min: BigNumber): Checkpoint[] {
  return Array.from({ length: size }, () => {
    return {
      ethReserve: min.plus(
        new BigNumber(
          BigNumber.random()
            .mul(max)
            .toFixed(0)
        )
      ),
      tokenReserve: min.plus(
        new BigNumber(
          BigNumber.random()
            .mul(max)
            .toFixed(0)
        )
      )
    };
  });
}

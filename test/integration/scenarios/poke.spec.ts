import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Provider } from 'ethereum-types';
import * as _ from 'lodash';

import { chai } from '../../utils/chai_setup';
import { TX_DEFAULTS, ZERO_AMOUNT } from '../../utils/constants';

import {
  MockPokerContract,
  MockUniswapExchangeContract,
  MockUniswapFactoryContract,
  MockERC20Contract,
  PolarisContract,
  OracleTokenContract
} from '../../../build/wrappers';

const { expect } = chai;

export function pokeTests(snapshotBlockchain: () => void) {
  describe('#poke', async () => {
    let borrowERC20: MockERC20Contract;
    let borrowOracleToken: OracleTokenContract;
    let borrowUniswapExchange: MockUniswapExchangeContract;
    let uniswapFactory: MockUniswapFactoryContract;
    let polaris: PolarisContract;

    let poker: string;
    let pokerBalanceBefore: BigNumber;
    let pokerReward: BigNumber;
    let maxCheckpoints: number;
    let pendingPeriod: BigNumber;
    let maxTimePeriod: BigNumber;

    let web3Wrapper: Web3Wrapper;
    let provider: Provider;

    before(async function() {
      ({ borrowERC20, poker, uniswapFactory, polaris } = this.protocol);

      provider = this.provider;
      web3Wrapper = new Web3Wrapper(provider);

      const borrowExchangeAddress = await uniswapFactory.getExchange.callAsync(borrowERC20.address);
      borrowUniswapExchange = MockUniswapExchangeContract.new(borrowExchangeAddress, this.provider, TX_DEFAULTS);

      pokerReward = await polaris.CHECKPOINT_REWARD.callAsync();
      maxCheckpoints = await polaris.MAX_CHECKPOINTS.callAsync();
      pendingPeriod = await polaris.PENDING_PERIOD.callAsync();
      maxTimePeriod = await polaris.MAX_TIME_SINCE_LAST_CHECKPOINT.callAsync();
    });

    it('should only allow externally owned accounts to poke', async () => {
      const mockPoker = await MockPokerContract.deployAsync(provider, TX_DEFAULTS, polaris.address);

      expect(mockPoker.poke.sendTransactionAsync(borrowERC20.address)).to.be.rejectedWith(
        'Polaris::poke: Poke must be called by an externally owned account'
      );
    });

    describe('first token poke', () => {
      snapshotBlockchain();

      it('should reward for Oracle Token creation plus poke', async () => {
        pokerBalanceBefore = ZERO_AMOUNT;
        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
        const expectedPokerBalance = pokerBalanceBefore.plus(pokerReward.times(10));
        const borrowOracleTokenAddress = await polaris.oracleTokens.callAsync(borrowERC20.address);

        borrowOracleToken = OracleTokenContract.new(borrowOracleTokenAddress, provider, TX_DEFAULTS);
        const afterBalance = await borrowOracleToken.balanceOf.callAsync(poker);

        expect(afterBalance).to.be.bignumber.equal(expectedPokerBalance);
      });
    });

    describe('poke for 1% price change from previous poke', () => {
      snapshotBlockchain();

      before(async () => {
        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
        const borrowOracleTokenAddress = await polaris.oracleTokens.callAsync(borrowERC20.address);

        borrowOracleToken = OracleTokenContract.new(borrowOracleTokenAddress, provider, TX_DEFAULTS);

        const currentExchangeBalance = await web3Wrapper.getBalanceInWeiAsync(borrowUniswapExchange.address);
        const increaseByOnePercent = currentExchangeBalance.times(0.011);

        await web3Wrapper.sendTransactionAsync({
          from: poker,
          value: increaseByOnePercent,
          to: borrowUniswapExchange.address
        });

        pokerBalanceBefore = await borrowOracleToken.balanceOf.callAsync(poker);

        await web3Wrapper.increaseTimeAsync(1);
        await web3Wrapper.mineBlockAsync();

        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
      });

      it('should reward poke', async () => {
        const afterBalance = await borrowOracleToken.balanceOf.callAsync(poker);
        const expectedPokerBalance = pokerBalanceBefore.plus(pokerReward);

        expect(afterBalance).to.be.bignumber.equal(expectedPokerBalance);
      });
    });

    describe('poke for 1% price change from overall median', () => {
      snapshotBlockchain();

      before(async () => {
        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
        const borrowOracleTokenAddress = await polaris.oracleTokens.callAsync(borrowERC20.address);

        borrowOracleToken = OracleTokenContract.new(borrowOracleTokenAddress, provider, TX_DEFAULTS);

        const currentExchangeBalance = await web3Wrapper.getBalanceInWeiAsync(borrowUniswapExchange.address);
        const increaseByFivePercent = currentExchangeBalance.times(0.05);

        await web3Wrapper.sendTransactionAsync({
          from: poker,
          value: increaseByFivePercent,
          to: borrowUniswapExchange.address
        });

        await web3Wrapper.increaseTimeAsync(1);
        await web3Wrapper.mineBlockAsync();

        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });

        pokerBalanceBefore = await borrowOracleToken.balanceOf.callAsync(poker);

        await web3Wrapper.increaseTimeAsync(+pendingPeriod.plus(1));
        await web3Wrapper.mineBlockAsync();

        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
      });

      it('should reward poke', async () => {
        const afterBalance = await borrowOracleToken.balanceOf.callAsync(poker);
        const expectedPokerBalance = pokerBalanceBefore.plus(pokerReward);

        expect(afterBalance).to.be.bignumber.equal(expectedPokerBalance);
      });
    });

    describe('poke for 1% price change from pending median', () => {
      snapshotBlockchain();

      before(async () => {
        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
        const borrowOracleTokenAddress = await polaris.oracleTokens.callAsync(borrowERC20.address);

        borrowOracleToken = OracleTokenContract.new(borrowOracleTokenAddress, provider, TX_DEFAULTS);

        const currentExchangeBalance = await web3Wrapper.getBalanceInWeiAsync(borrowUniswapExchange.address);
        const increaseByFivePercent = currentExchangeBalance.times(0.05);

        await web3Wrapper.increaseTimeAsync(+pendingPeriod.plus(1));
        await web3Wrapper.mineBlockAsync();

        await web3Wrapper.sendTransactionAsync({
          from: poker,
          value: increaseByFivePercent,
          to: borrowUniswapExchange.address
        });

        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });

        await web3Wrapper.increaseTimeAsync(1);
        await web3Wrapper.mineBlockAsync();

        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });

        await web3Wrapper.increaseTimeAsync(1);
        await web3Wrapper.mineBlockAsync();

        await borrowUniswapExchange.removeEth.sendTransactionAsync(increaseByFivePercent);

        await web3Wrapper.increaseTimeAsync(1);
        await web3Wrapper.mineBlockAsync();

        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });

        await web3Wrapper.increaseTimeAsync(1);
        await web3Wrapper.mineBlockAsync();

        pokerBalanceBefore = await borrowOracleToken.balanceOf.callAsync(poker);

        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
      });

      it('should reward poke', async () => {
        const afterBalance = await borrowOracleToken.balanceOf.callAsync(poker);
        const expectedPokerBalance = pokerBalanceBefore.plus(pokerReward);

        expect(afterBalance).to.be.bignumber.equal(expectedPokerBalance);
      });

      it('should have correct pending length', async () => {
        const medianizer = await polaris.getMedianizer.callAsync(borrowERC20.address);

        expect(medianizer.pending.length).to.equal(4);
      });
    });

    describe('poke for no pokes in maximum time frame', () => {
      snapshotBlockchain();

      before(async () => {
        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
        const borrowOracleTokenAddress = await polaris.oracleTokens.callAsync(borrowERC20.address);

        borrowOracleToken = OracleTokenContract.new(borrowOracleTokenAddress, provider, TX_DEFAULTS);

        await web3Wrapper.increaseTimeAsync(+maxTimePeriod.plus(1));
        await web3Wrapper.mineBlockAsync();

        pokerBalanceBefore = await borrowOracleToken.balanceOf.callAsync(poker);
        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
      });

      it('should reward poke', async () => {
        const afterBalance = await borrowOracleToken.balanceOf.callAsync(poker);
        const expectedPokerBalance = pokerBalanceBefore.plus(pokerReward);

        expect(afterBalance).to.be.bignumber.equal(expectedPokerBalance);
      });
    });

    describe('Register poke but do not payout reward if criteria not met', () => {
      let previousTailIndex: number;

      snapshotBlockchain();

      before(async () => {
        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });

        const borrowOracleTokenAddress = await polaris.oracleTokens.callAsync(borrowERC20.address);

        borrowOracleToken = OracleTokenContract.new(borrowOracleTokenAddress, provider, TX_DEFAULTS);

        const currentExchangeBalance = await web3Wrapper.getBalanceInWeiAsync(borrowUniswapExchange.address);
        const increaseByLessThanOnePercent = new BigNumber(currentExchangeBalance.times(0.009).toFixed(0));

        await web3Wrapper.sendTransactionAsync({
          from: poker,
          value: increaseByLessThanOnePercent,
          to: borrowUniswapExchange.address
        });

        await web3Wrapper.increaseTimeAsync(+pendingPeriod.plus(1));
        await web3Wrapper.mineBlockAsync();

        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });

        const medianizer = await polaris.getMedianizer.callAsync(borrowERC20.address);
        previousTailIndex = medianizer.tail;

        pokerBalanceBefore = await borrowOracleToken.balanceOf.callAsync(poker);

        await web3Wrapper.increaseTimeAsync(+pendingPeriod.plus(1));
        await web3Wrapper.mineBlockAsync();

        await polaris.poke.sendTransactionAsync(borrowERC20.address, { from: poker });
      });

      it('should not reward poke', async () => {
        const afterBalance = await borrowOracleToken.balanceOf.callAsync(poker);

        expect(afterBalance).to.be.bignumber.equal(pokerBalanceBefore);
      });

      it('should increase tail index by 1', async () => {
        const medianizer = await polaris.getMedianizer.callAsync(borrowERC20.address);
        const tailAfter = +medianizer.tail;
        const expectedTailIndex = (previousTailIndex + 1) % maxCheckpoints;

        expect(tailAfter).to.equal(expectedTailIndex);
      });
    });
  });
}

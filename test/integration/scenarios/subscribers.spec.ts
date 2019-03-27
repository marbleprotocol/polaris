import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { Provider, TransactionReceiptWithDecodedLogs, Transaction } from 'ethereum-types';
import * as _ from 'lodash';

import { chai } from '../../utils/chai_setup';
import {
  ETH_ADDRESS,
  ONE_ETH_IN_WEI,
  TX_DEFAULTS,
  ONE_MONTH_IN_SECONDS,
  ONE_DAY_IN_SECONDS
} from '../../utils/constants';

import {
  MockSubscriberContract,
  MockERC20Contract,
  OracleTokenContract,
  PolarisContract
} from '../../../build/wrappers';

const { expect } = chai;

export function subscribersTests(snapshotBlockchain: () => void) {
  describe('#subscribers', async () => {
    let borrowERC20: MockERC20Contract;
    let borrowOracleToken: OracleTokenContract;
    let collateralERC20: MockERC20Contract;
    let subscriber: MockSubscriberContract;
    let polaris: PolarisContract;

    let poker: string;

    let subscriptionFee: BigNumber;

    let web3Wrapper: Web3Wrapper;
    let provider: Provider;

    snapshotBlockchain();

    before(async function() {
      ({ borrowERC20, collateralERC20, poker, subscriber, polaris } = this.protocol);

      provider = this.provider;
      web3Wrapper = new Web3Wrapper(provider);

      subscriptionFee = await polaris.MONTHLY_SUBSCRIPTION_FEE.callAsync();

      await polaris.poke.sendTransactionAsync(borrowERC20.address, {
        from: poker
      });
      await polaris.poke.sendTransactionAsync(collateralERC20.address, {
        from: poker
      });

      const borrowOracleTokenAddress = await polaris.oracleTokens.callAsync(borrowERC20.address);

      borrowOracleToken = OracleTokenContract.new(borrowOracleTokenAddress, provider, TX_DEFAULTS);
    });

    describe('Subscribing to feed', () => {
      it('non-subscriber cannot read median', async () => {
        expect(
          subscriber.getDestAmount.callAsync(borrowERC20.address, ETH_ADDRESS, ONE_ETH_IN_WEI)
        ).to.be.rejectedWith('Polaris::getDestAmount: Not subscribed');
      });

      it('non-subscriber cannot read checkpoint data', async () => {
        expect(subscriber.getMedianizer.callAsync(borrowERC20.address)).to.be.rejectedWith(
          'Polaris::getMedianizer: Not subscribed'
        );
      });

      it('subscriber can read median', async () => {
        await subscriber.subscribe.sendTransactionAsync(borrowERC20.address, {
          value: subscriptionFee
        });

        const expectedDestAmount = await polaris.getDestAmount.callAsync(
          borrowERC20.address,
          ETH_ADDRESS,
          ONE_ETH_IN_WEI
        );

        const subscriberDestAmount = await subscriber.getDestAmount.callAsync(
          borrowERC20.address,
          ETH_ADDRESS,
          ONE_ETH_IN_WEI
        );

        expect(subscriberDestAmount).to.be.bignumber.equal(expectedDestAmount);
      });

      it('subscriber can read checkpoint data', async () => {
        await subscriber.subscribe.sendTransactionAsync(borrowERC20.address, {
          value: subscriptionFee
        });

        expect(subscriber.getMedianizer.callAsync(borrowERC20.address)).to.be.eventually.fulfilled;
      });

      it('subscriber cannot read median if does not subscribed to both asset streams', async () => {
        await subscriber.subscribe.sendTransactionAsync(borrowERC20.address, {
          value: subscriptionFee
        });

        expect(
          subscriber.getDestAmount.callAsync(
            borrowERC20.address,
            collateralERC20.address,
            ONE_ETH_IN_WEI
          )
        ).to.be.rejectedWith('Polaris::getDestAmount: Not subscribed');
      });

      it('subscriber can read median if subscribed to both asset streams', async () => {
        await subscriber.subscribe.sendTransactionAsync(borrowERC20.address, {
          value: subscriptionFee
        });

        await subscriber.subscribe.sendTransactionAsync(collateralERC20.address, {
          value: subscriptionFee
        });

        const expectedDestAmount = await polaris.getDestAmount.callAsync(
          borrowERC20.address,
          collateralERC20.address,
          ONE_ETH_IN_WEI
        );

        const subscriberDestAmount = await subscriber.getDestAmount.callAsync(
          borrowERC20.address,
          collateralERC20.address,
          ONE_ETH_IN_WEI
        );

        expect(subscriberDestAmount).to.be.bignumber.equal(expectedDestAmount);
      });
    });

    describe('#subscribe', () => {
      it('cannot deposit less than a month', async () => {
        const oneMonthOfFee = new BigNumber(subscriptionFee.div(12).toFixed(0));

        expect(
          subscriber.subscribe.sendTransactionAsync(borrowERC20.address, {
            value: oneMonthOfFee.sub(1)
          })
        ).to.be.rejectedWith('Polaris::subscribe: Account balance is below the minimum');
      });
    });

    describe('#unsubscribe', () => {
      let expectedWithdrawAmount: BigNumber;
      let subscriberOracleBalanceBefore: BigNumber;
      let subscriberEthBalanceBefore: BigNumber;

      snapshotBlockchain();

      before(async () => {
        const subscriptionDeposit = subscriptionFee.mul(2);
        await subscriber.subscribe.sendTransactionAsync(borrowERC20.address, {
          value: subscriptionDeposit
        });

        expectedWithdrawAmount = subscriptionFee;
        const withdrawAmount = expectedWithdrawAmount.plus(10);

        const account = await polaris.getAccount.callAsync(borrowERC20.address, subscriber.address);
        subscriberOracleBalanceBefore = account.balance;
        subscriberEthBalanceBefore = await web3Wrapper.getBalanceInWeiAsync(subscriber.address);

        await subscriber.unsubscribe.sendTransactionAsync(borrowERC20.address, withdrawAmount);
      });

      it('should leave subscriber oracle balance with at least minimum upon unsubscribe', async () => {
        const account = await polaris.getAccount.callAsync(borrowERC20.address, subscriber.address);
        const balanceAfter = account.balance;
        const actualWithdrawAmount = subscriberOracleBalanceBefore.sub(balanceAfter);

        expect(actualWithdrawAmount).to.be.bignumber.equal(expectedWithdrawAmount);
      });

      it('should increase subscriber ETH balance by withdraw amount', async () => {
        const balanceAfter = await web3Wrapper.getBalanceInWeiAsync(subscriber.address);
        const expectedBalance = subscriberEthBalanceBefore.plus(expectedWithdrawAmount);

        expect(balanceAfter).to.be.bignumber.equal(expectedBalance);
      });
    });

    describe('#collect', () => {
      describe('should collect appropriate fee amount', async () => {
        let polarisEthBalanceBefore: BigNumber;
        let oracleTokenEthBalanceBefore: BigNumber;
        let owedAmount: BigNumber;
        let txReceipt: TransactionReceiptWithDecodedLogs;

        snapshotBlockchain();

        before(async () => {
          await subscriber.subscribe.sendTransactionAsync(borrowERC20.address, {
            value: subscriptionFee
          });

          const timeElapsedInSeconds = ONE_DAY_IN_SECONDS;

          await web3Wrapper.increaseTimeAsync(+timeElapsedInSeconds);
          await web3Wrapper.mineBlockAsync();

          owedAmount = new BigNumber(
            subscriptionFee
              .mul(timeElapsedInSeconds)
              .div(ONE_MONTH_IN_SECONDS)
              .toFixed(0, BigNumber.ROUND_FLOOR)
          );

          polarisEthBalanceBefore = await web3Wrapper.getBalanceInWeiAsync(polaris.address);

          oracleTokenEthBalanceBefore = await web3Wrapper.getBalanceInWeiAsync(
            borrowOracleToken.address
          );

          await polaris.collect.callAsync(borrowERC20.address, subscriber.address);

          const txHash = await polaris.collect.sendTransactionAsync(
            borrowERC20.address,
            subscriber.address
          );
          txReceipt = await web3Wrapper.awaitTransactionSuccessAsync(txHash);
        });

        it('should decrease subscriber balance by fee amount', async () => {
          const account = await polaris.getAccount.callAsync(
            borrowERC20.address,
            subscriber.address
          );
          const balance = account.balance;
          const expectedBalance = subscriptionFee.sub(owedAmount);

          expect(balance).to.be.bignumber.equal(expectedBalance);
        });

        it('should set subscriber payments to correct timestamp', async () => {
          const account = await polaris.getAccount.callAsync(
            borrowERC20.address,
            subscriber.address
          );
          const timestamp = account.collectionTimestamp;
          const expectedTimestamp = await web3Wrapper.getBlockTimestampAsync(txReceipt.blockNumber);

          expect(timestamp).to.be.bignumber.equal(expectedTimestamp);
        });

        it('should decrease Polaris ETH balance by owed amount', async () => {
          const balance = await await web3Wrapper.getBalanceInWeiAsync(polaris.address);
          const expectedBalance = polarisEthBalanceBefore.sub(owedAmount);

          expect(balance).to.be.bignumber.equal(expectedBalance);
        });

        it('should increase OracleToken ETH balance by owed amount', async () => {
          const balance = await await web3Wrapper.getBalanceInWeiAsync(borrowOracleToken.address);
          const expectedBalance = oracleTokenEthBalanceBefore.plus(owedAmount);

          expect(balance).to.be.bignumber.equal(expectedBalance);
        });
      });
    });
  });
}

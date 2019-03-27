import { ganacheProvider, BlockchainLifecycle } from '@marbleprotocol/dev-utils';
import * as _ from 'lodash';

import { deployPriceOracle } from '../utils/deployer';
import { TX_DEFAULTS } from '../utils/constants';

import { getDestAmountTests } from './scenarios/getDestAmount.spec';
import { pokeTests } from './scenarios/poke.spec';
import { subscribersTests } from './scenarios/subscribers.spec';

const provider = ganacheProvider();
const blockchainLifecycle = new BlockchainLifecycle(provider);

const snapshot = () => {
  before(async function() {
    await blockchainLifecycle.startAsync();
  });

  after(async function() {
    await blockchainLifecycle.revertAsync();
  });
};

describe('Polaris', () => {
  before(async function() {
    this.protocol = await deployPriceOracle(provider, TX_DEFAULTS);
    this.provider = provider;
  });

  beforeEach(async function() {
    await blockchainLifecycle.startAsync();
  });

  afterEach(async function() {
    await blockchainLifecycle.revertAsync();
  });

  getDestAmountTests(snapshot);
  pokeTests(snapshot);
  subscribersTests(snapshot);
});

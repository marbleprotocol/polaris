import {
  FakeGasEstimateSubprovider,
  RPCSubprovider,
  PrivateKeyWalletSubprovider,
  Web3ProviderEngine
} from '@0x/subproviders';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as dotenv from 'dotenv';

import { MarbleSubscriberContract, PolarisContract } from '../build/wrappers';

dotenv.load();

const infura = 'https://mainnet.infura.io/';
const provider = new Web3ProviderEngine();
const privateKey = process.env.PRIVATE_KEY as string;
provider.addProvider(new PrivateKeyWalletSubprovider(privateKey));
provider.addProvider(new RPCSubprovider(infura));
provider.addProvider(new FakeGasEstimateSubprovider(8000000));
provider.start();

(async () => {
  try {
    const web3Wrapper = new Web3Wrapper(provider);
    const [deployer] = await web3Wrapper.getAvailableAddressesAsync();
    const txDefaults = { from: deployer, gas: 6500000 };

    const uniswapFactoryAddr = '0xc0a47dfe034b400b47bdad5fecda2621de6c4d95';

    const oracle = await PolarisContract.deployAsync(provider, txDefaults, uniswapFactoryAddr);
    await MarbleSubscriberContract.deployAsync(provider, txDefaults, oracle.address);
  } catch (e) {
    console.log(e);
  }
  process.exit();
})();

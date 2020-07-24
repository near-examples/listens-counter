const { Contract, KeyPair } = nearAPI;
const { parseNearAmount } = nearAPI.utils.format;

jest.setTimeout(240000);

let ctx;

const contractConfig = {
    viewMethods: [],
    changeMethods: ['trackListened'],
}

beforeAll(async function () {
  ctx = {};

  // NOTE: nearlib and nearConfig are made available by near-shell/test_environment
  ctx.near = await nearAPI.connect(nearConfig);
  ctx.accountId = nearConfig.contractName;
  ctx.contract = await ctx.near.loadContract(nearConfig.contractName, {
    ...contractConfig,
    sender: ctx.accountId
  });
});

test('trackListened', async () => {
  expect(await ctx.contract.trackListened({ trackId: 'Song 1' })).toEqual('1');
  expect(await ctx.contract.trackListened({ trackId: 'Song 2' })).toEqual('1');
  expect(await ctx.contract.trackListened({ trackId: 'Song 1' })).toEqual('2');
})

const { functionCall, signTransaction } = nearAPI.transactions;

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

test('trackListened benchmark', async () => {
  const masterAccount = await ctx.near.account(ctx.accountId);
  const NUM_ACCOUNTS = 100;
  const TRANSACTIONS_PER_ACCOUNT = 30;

  let contracts = [];
  for (let i = 0; i < NUM_ACCOUNTS; i++) {
    contracts.push((async () => {
      const accountId = `test-user-${i}.${masterAccount.accountId}`;
      const keyPair = KeyPair.fromRandom('ed25519');
      await ctx.near.connection.signer.keyStore.setKey(nearConfig.networkId, accountId, keyPair);
      await masterAccount.createAccount(accountId, keyPair.publicKey, parseNearAmount('0.1'));
      const account = await ctx.near.account(accountId);
      const contract = new Contract(account, nearConfig.contractName, contractConfig);
      return contract
    })());
    await sleep(200);
  }
  contracts = await Promise.all(contracts);

  const all = [];
  console.time('submit transactions');
  // for (let j = 0; j < TRANSACTIONS_PER_ACCOUNT; j++) {
  //   for (let i = 0; i < NUM_ACCOUNTS; i++) {
  //     const contract = contracts[i];
  //     all.push(contract.trackListened({ trackId: `Song ${j}` }));
  //     await sleep(10);
  //   }
  // }
  for (let i = 0; i < NUM_ACCOUNTS; i++) {
    all.push((async () => {
      for (let j = 0; j < TRANSACTIONS_PER_ACCOUNT; j++) {
        const contract = contracts[i];
        await contract.trackListened({ trackId: `Song ${j}` });
      }
    })());
  }
  await Promise.all(all);
  console.timeEnd('submit transactions');
});
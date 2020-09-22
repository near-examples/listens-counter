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

  // NOTE: nearlib and nearConfig are made available by near-cli/test_environment
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
});

jest.setTimeout(15000);

beforeAll(async function () {
  // NOTE: nearlib and nearConfig are made available by near-shell/test_environment
  const near = await nearlib.connect(nearConfig);
  window.accountId = nearConfig.contractName;
  window.contract = await near.loadContract(nearConfig.contractName, {
    viewMethods: [],
    changeMethods: ['trackListened'],
    sender: window.accountId
  });
});

test('trackListened', async () => {
  expect(await window.contract.trackListened({ trackId: 'Song 1' })).toEqual('1');
  expect(await window.contract.trackListened({ trackId: 'Song 2' })).toEqual('1');
  expect(await window.contract.trackListened({ trackId: 'Song 1' })).toEqual('2');
})

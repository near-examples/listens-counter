const { Contract, KeyPair, connect } = require('near-api-js');
const { InMemoryKeyStore } = require('near-api-js').keyStores;
const { parseNearAmount } = require('near-api-js').utils.format;

async function runBenchmark() {
    const contractConfig = {
        viewMethods: [],
        changeMethods: ['trackListened'],
    }

    const config = require('./config')(process.NODE_ENV || 'development');
    const keyStore = new InMemoryKeyStore();
    const near = await connect({ ...config, keyStore });

    const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

    console.log('Setting up and deploying contract');
    const masterAccountName = `test-${Date.now()}.testnet`;
    const contractName = masterAccountName;
    const keyPair = KeyPair.fromRandom('ed25519');
    await keyStore.setKey(config.networkId, masterAccountName, keyPair);
    const masterAccount = await near.createAccount(masterAccountName, keyPair.publicKey.toString());
    await masterAccount.deployContract(require('fs').readFileSync('./out/main.wasm'));

    const NUM_ACCOUNTS = 50;
    const TRANSACTIONS_PER_ACCOUNT = 30;

    console.log('Creating accounts')
    console.time('create accounts');
    let contracts = [];
    for (let i = 0; i < NUM_ACCOUNTS; i++) {
        contracts.push((async () => {
            const accountId = `test-user-${i}.${masterAccount.accountId}`;
            const keyPair = KeyPair.fromRandom('ed25519');
            await keyStore.setKey(config.networkId, accountId, keyPair);
            await masterAccount.createAccount(accountId, keyPair.publicKey, parseNearAmount('0.1'));
            const account = await near.account(accountId);
            const contract = new Contract(account, contractName, contractConfig);
            return contract
        })());
        await sleep(200);
    }
    contracts = await Promise.all(contracts);
    console.timeEnd('create accounts');

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
                //console.log('i j', i, j);
                process.stdout.write('.');
            }
        })());
    }
    await Promise.all(all);
    console.timeEnd('submit transactions');
}

runBenchmark().catch(console.error);
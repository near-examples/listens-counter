const { Contract, KeyPair, connect } = require('near-api-js');
const { InMemoryKeyStore } = require('near-api-js').keyStores;
const { parseNearAmount } = require('near-api-js').utils.format;

if (process.argv.length !== 4) {
    console.log('Usage: node src/benchmark.js <NUM_ACCOUNTS> <TRANSACTIONS_PER_ACCOUNT>');
    process.exit(1);
}

const [ NUM_ACCOUNTS, TRANSACTIONS_PER_ACCOUNT ] = process.argv.slice(2).map((s) => parseInt(s));

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
        await sleep(500);
    }
    contracts = await Promise.all(contracts);
    console.timeEnd('create accounts');

    console.log('Submitting transactions');
    const all = [];
    let numFailed = 0;
    console.time('submit transactions');
    for (let i = 0; i < NUM_ACCOUNTS; i++) {
        all.push((async () => {
            for (let j = 0; j < TRANSACTIONS_PER_ACCOUNT; j++) {
                const contract = contracts[i];
                try {
                    await contract.trackListened({ trackId: `Song ${j}` });
                    process.stdout.write((j % 10).toString());
                } catch (e) {
                    numFailed++;
                    process.stdout.write('E');
                }
            }
        })());
    }
    await Promise.all(all);
    console.timeEnd('submit transactions');
    console.log('Number of failed transactions: ', numFailed);
}

runBenchmark().catch(console.error);
# Solana transaction

## install
```js
npm install
npm install -g typescript
```

## build
```js
rm -rf dist && npm run build && npm run test 
```

## npm install package
```js
npm install git+https://github.com/UniOasis/solana-transaction.git
```

## Swap  

將aIn 的 fromCoinMint 換(swap)到 aOut 的toCoinMint

### function 
swap()

### input

- lpMintAddr #string
- ammAuthority #string
- payerPhrase #string(12 word usually)
- fromCoinMint #string
- toCoinMint #string
- aIn #int
- aOut #int

ammAuthority大部分情況都可以用example code, PayerPhrase貼自己錢包的註記詞, aIn/aOut 的數值要去查一下現在價格比,若差太多會無法swap

### output
- txhash #string

### example successful output
![image](https://github.com/ChunWang1998/raydium-tx/blob/main/%E6%88%AA%E5%9C%96%202022-01-20%20%E4%B8%8B%E5%8D%882.19.54.png)
### example code 
```js
const { Connection, Keypair } = require('@solana/web3.js')
const { swap, NATIVE_SOL, TOKENS, LIQUIDITY_POOLS, createATA } = require("solana-transaction")
const bip39 = require('bip39')

//to get phantom account
const { derivePath } = require('ed25519-hd-key');
const nacl = require('tweetnacl')
function deriveSeed(seed, walletIndex, derivationPath, accountIndex) {
    switch (derivationPath) {

        case DERIVATION_PATH.phantom:
            const path44Change = `m/44'/501'/${walletIndex}'/0'`;
            return derivePath(path44Change, seed).key;
        default:
            throw new Error(`invalid derivation path: ${derivationPath}`);
    }
}
function getAccountFromSeed(
    seed,
    walletIndex,
    dPath = undefined,
    accountIndex = 0,
) {
    const derivedSeed = deriveSeed(seed, walletIndex, dPath, accountIndex);
    return Keypair.fromSecretKey(nacl.sign.keyPair.fromSeed(derivedSeed).secretKey);
}
const DERIVATION_PATH = {
    deprecated: undefined,
    recommended: 'bip44',
    phantom: 'bip44Change',
};
const API_ENDPOINT = "https://api.mainnet-beta.solana.com";
const CONNECTION = new Connection(API_ENDPOINT);


async function testSwap() {
    //TODO:paste your secret recovery key
    const payerPhrase =
    const seed = await bip39.mnemonicToSeed(payerPhrase)
    let PAYER = getAccountFromSeed(seed, 0, DERIVATION_PATH.phantom)
    userOwner = getAccountFromSeed(seed, 0, DERIVATION_PATH.phantom)

    let pairTokenRefers = [];
    pairTokenRefers.push(
        {
            lpMintAddr: "8HoQnePLqPj4M7PUDzfw8e3Ymdwgc7NLGnaTUapubyvu",//sol-usdc
            fromCoinMint: NATIVE_SOL.mintAddress,
            toCoinMint: TOKENS.USDC.mintAddress,
            //要先知道現在價格
            aIn: 0.001,
            aOut: 0.135,
            ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
        },
        {
            lpMintAddr: "8HoQnePLqPj4M7PUDzfw8e3Ymdwgc7NLGnaTUapubyvu",//sol-usdc
            fromCoinMint: TOKENS.USDC.mintAddress,
            toCoinMint: NATIVE_SOL.mintAddress,
            aIn: 0.1,
            aOut: 0.00073,
            ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
        },
        {
            lpMintAddr: "Epm4KfTj4DMrvqn6Bwg2Tr2N8vhQuNbuK8bESFp4k33K",//sol-usdt
            fromCoinMint: NATIVE_SOL.mintAddress,
            toCoinMint: TOKENS.USDT.mintAddress,
            aIn: 0.001,
            aOut: 0.135,
            ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
        },
        {
            lpMintAddr: "7P5Thr9Egi2rvMmEuQkLn8x8e8Qro7u2U7yLD2tU2Hbe",//ray-srm
            fromCoinMint: TOKENS.RAY.mintAddress,
            toCoinMint: TOKENS.SRM.mintAddress,
            aIn: 0.001,
            aOut: 0.0017,
            ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
        },
        // {
        //     lpMintAddr: "AKJHspCwDhABucCxNLXUSfEzb7Ny62RqFtC9uNjJi4fq",//srm-sol
        //     fromCoinMint: TOKENS.SRM.mintAddress,
        //     toCoinMint: NATIVE_SOL.mintAddress,
        //     aIn: 0.1,
        //     aOut: 0.0021,
        //     ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
        // }
    )

    for (var pairTokenRefer of pairTokenRefers) {
        pairTokenRefer.fromTokenAccount = await createATA(userOwner.publicKey.toBase58(), pairTokenRefer.fromCoinMint);
        pairTokenRefer.toTokenAccount = await createATA(userOwner.publicKey.toBase58(), pairTokenRefer.toCoinMint)
    }

    wsolAddress = null;
    for (var pairTokenRefer of pairTokenRefers) {
        const poolinfo = LIQUIDITY_POOLS.find(item => item.lp.mintAddress == pairTokenRefer.lpMintAddr);// looking for the match pool
        console.log("POOL:" + poolinfo.lp.mintAddress);

        let [tx, signers] = await swap({
            ammId: poolinfo.ammId,
            ammOpenOrders: poolinfo.ammOpenOrders,
            ammTargetOrders: poolinfo.ammTargetOrders,
            poolCoinTokenAccount: poolinfo.poolCoinTokenAccount,
            poolPcTokenAccount: poolinfo.poolPcTokenAccount,
            serumMarket: poolinfo.serumMarket,
            serumBids: poolinfo.serumBids,
            serumAsks: poolinfo.serumAsks,
            serumEventQueue: poolinfo.serumEventQueue,
            serumCoinVaultAccount: poolinfo.serumCoinVaultAccount,
            serumPcVaultAccount: poolinfo.serumPcVaultAccount,
            serumVaultSigner: poolinfo.serumVaultSigner,

            ammAuthority: pairTokenRefer.ammAuthority,
            userOwner: userOwner.publicKey.toBase58(),
            connection: CONNECTION,
            fromCoinMint: pairTokenRefer.fromCoinMint,//sol token address:11111111111111111111111111111111
            toCoinMint: pairTokenRefer.toCoinMint,
            fromTokenAccount: pairTokenRefer.fromTokenAccount,//be used when fromCoinMint is not native
            toTokenAccount: pairTokenRefer.toTokenAccount,//be used when toCoinMint is not native
            aIn: pairTokenRefer.aIn,
            aOut: pairTokenRefer.aOut,
            wsolAddress: wsolAddress
        });

        tx.feePayer = PAYER.publicKey;
        signers.push(PAYER);
        let txhash = await CONNECTION.sendTransaction(tx, signers);

        console.log("tx hash: " + txhash)
    }
}
testSwap()
```


## Havest

在raydium 頁面的 "Farms" 和 “Staking”, 都有pending reward 可以harvest, 這個function實作此功能,不論是 "Farms" 和 “Staking”的token 都可以操作

### input
- lpMintAddr #string
- payerPhrase #string(12 word usually)

### output

若沒有harvest reward, 會跳出“Blockhash not found” err msg
- txhash #string

### example successful output
![image](https://github.com/ChunWang1998/raydium-tx/blob/main/%E6%88%AA%E5%9C%96%202022-01-20%20%E4%B8%8B%E5%8D%882.19.54.png)

### example code 
```js
const { Connection ,Keypair} = require('@solana/web3.js')
const { harvest } = require("solana-transaction")
const bip39 = require('bip39')

//to get phantom account
const { derivePath } = require('ed25519-hd-key');
const nacl = require('tweetnacl')
function deriveSeed(seed, walletIndex, derivationPath, accountIndex) {
    switch (derivationPath) {

        case DERIVATION_PATH.phantom:
            const path44Change = `m/44'/501'/${walletIndex}'/0'`;
            return derivePath(path44Change, seed).key;
        default:
            throw new Error(`invalid derivation path: ${derivationPath}`);
    }
}
function getAccountFromSeed(
    seed,
    walletIndex,
    dPath = undefined,
    accountIndex = 0,
) {
    const derivedSeed = deriveSeed(seed, walletIndex, dPath, accountIndex);
    return Keypair.fromSecretKey(nacl.sign.keyPair.fromSeed(derivedSeed).secretKey);
}
const DERIVATION_PATH = {
    deprecated: undefined,
    recommended: 'bip44',
    phantom: 'bip44Change',
};
const API_ENDPOINT = "https://solana-api.projectserum.com";
const CONNECTION = new Connection(API_ENDPOINT);
async function testHarvest() {
    //TODO:paste your secret recovery key
    const payerPhrase = 
    const seed = await bip39.mnemonicToSeed(payerPhrase)
    let owner = getAccountFromSeed(seed, 0, DERIVATION_PATH.phantom)
    let PAYER = getAccountFromSeed(seed, 0, DERIVATION_PATH.phantom)

    let lpMintAddrs = [];
    lpMintAddrs.push(
        {
            lpMintAddr: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"//RAY , to get farmInfo
        },
        {
            lpMintAddr: "FbC6K13MzHvN42bXrtGaWsvZY9fxrackRSZcBGfjPc7m"//RAY-usdc (v3), to get farmInfo
        },
        {
            lpMintAddr: "7P5Thr9Egi2rvMmEuQkLn8x8e8Qro7u2U7yLD2tU2Hbe"//RAY-srm (v5), to get farmInfo
        },
        {
            lpMintAddr: "89ZKE4aoyfLBe2RuV6jM3JGNhaV18Nxh8eNtjRcndBip"//RAY-sol (v3), to get farmInfo
        }
    )

    for (var lpMintAddr of lpMintAddrs) {
        let [tx, signers] = await harvest(
            {
                connection: CONNECTION,
                owner: owner,
                lpMintAddr: lpMintAddr.lpMintAddr,//to get farmInfo
            }
        )
        tx.feePayer = PAYER.publicKey;
        signers.push(PAYER);
        let txhash = await CONNECTION.sendTransaction(tx, signers);
        console.log("tx hash: " + txhash)
    }
}

testHarvest()
```

## Stake

在raydium 頁面的 "Farms" 和 “Staking”, 可以stake LP 或是 stake RAY, 這個function實作此功能,不論是 "Farms" 和 “Staking”的token 都可以操作

### input

- lpMintAddr #string
- payerPhrase #string(12 word usually)
- amount #string

### output

若在stake farm時沒有足夠的lp token 或stake ray 時沒有足夠的ray,會跳出insufficient funds error
- txhash #string

### example successful output
![image](https://github.com/ChunWang1998/raydium-tx/blob/main/%E6%88%AA%E5%9C%96%202022-01-20%20%E4%B8%8B%E5%8D%882.19.54.png)

### example code 
```js
const { Connection, Keypair } = require('@solana/web3.js')
const { stake } = require("solana-transaction")
const bip39 = require('bip39')

//to get phantom account
const { derivePath } = require('ed25519-hd-key');
const nacl = require('tweetnacl')
function deriveSeed(seed, walletIndex, derivationPath, accountIndex) {
    switch (derivationPath) {

        case DERIVATION_PATH.phantom:
            const path44Change = `m/44'/501'/${walletIndex}'/0'`;
            return derivePath(path44Change, seed).key;
        default:
            throw new Error(`invalid derivation path: ${derivationPath}`);
    }
}
function getAccountFromSeed(
    seed,
    walletIndex,
    dPath = undefined,
    accountIndex = 0,
) {
    const derivedSeed = deriveSeed(seed, walletIndex, dPath, accountIndex);
    return Keypair.fromSecretKey(nacl.sign.keyPair.fromSeed(derivedSeed).secretKey);
}
const DERIVATION_PATH = {
    deprecated: undefined,
    recommended: 'bip44',
    phantom: 'bip44Change',
};
const API_ENDPOINT = "https://solana-api.projectserum.com";
const CONNECTION = new Connection(API_ENDPOINT);
async function testStake() {
    //TODO:paste your secret recovery key
    const payerPhrase = 
    const seed = await bip39.mnemonicToSeed(payerPhrase)
    let owner = getAccountFromSeed(seed, 0, DERIVATION_PATH.phantom)
    let PAYER = getAccountFromSeed(seed, 0, DERIVATION_PATH.phantom)
    let amount = "0.01";

    let lpMintAddrs = [];
    lpMintAddrs.push(
        {
            lpMintAddr: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"//RAY , to get farmInfo
        },
        // {
        //     lpMintAddr: "FbC6K13MzHvN42bXrtGaWsvZY9fxrackRSZcBGfjPc7m"//RAY-usdc (v3), to get farmInfo
        // },
        // {
        //     lpMintAddr: "7P5Thr9Egi2rvMmEuQkLn8x8e8Qro7u2U7yLD2tU2Hbe"//RAY-srm (v5), to get farmInfo
        // },
        // {
        //     lpMintAddr: "89ZKE4aoyfLBe2RuV6jM3JGNhaV18Nxh8eNtjRcndBip"//RAY-sol (v3), to get farmInfo
        // }
    )

    for (var lpMintAddr of lpMintAddrs) {
        let [tx, signers] = await stake(
            {
                amount: amount,
                connection: CONNECTION,
                owner: owner,
                lpMintAddr: lpMintAddr.lpMintAddr,//to get farmInfo
            }
        )
        tx.feePayer = PAYER.publicKey;
        signers.push(PAYER);
        let txhash = await CONNECTION.sendTransaction(tx, signers);
        console.log("tx hash: " + txhash)
    }
}

testStake()
```

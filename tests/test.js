// 'use strict';
const { describe, it } = require('mocha');
const { expect, assert } = require('chai');
const { Connection, Keypair, Transaction } = require('@solana/web3.js')
//const { swap, addLiquidity, createATA, harvest ,farm,NATIVE_SOL, TOKENS } = require('../dist/index')
const { RaydiumProtocol } = require('../dist/index')
//const { LIQUIDITY_POOLS } = require('../dist/lib/raydium/pools')
const bip39 = require('bip39')
const  bs58 = require( "bs58");
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

//const API_ENDPOINT = "http://api.devnet.solana.com";

const API_ENDPOINT = "https://solana-api.projectserum.com";

//const API_ENDPOINT = "https://api.mainnet-beta.solana.com";
const CONNECTION = new Connection(API_ENDPOINT);
describe('solana test', () => {

  // it('swap', async (

  // ) => {
  //   let PAYER = Keypair.fromSecretKey(
  //     bs58.decode("4g3WTg69bHNrtD4G3fXLFXvh1mxCZrDAnUHjVQxa6dnxNKSydWY3NHstu3bgeDrW1kNuYEjAtXSKw3jsQB1aMTZ2")
  //   );
  //   let userOwner = PAYER;

  //   let pairTokenRefers = [];
  //   pairTokenRefers.push(
  //     {
  //       lpMintAddr: "8HoQnePLqPj4M7PUDzfw8e3Ymdwgc7NLGnaTUapubyvu",//sol-usdc
  //       fromCoinMint: RaydiumProtocol.NATIVE_SOL.mintAddress,
  //       toCoinMint: RaydiumProtocol.TOKENS.USDC.mintAddress,
  //       //要先知道現在價格
  //       aIn: 0.001,
  //       aOut: 0.111488,
  //       ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  //     },
  //     // {
  //     //   lpMintAddr: "8HoQnePLqPj4M7PUDzfw8e3Ymdwgc7NLGnaTUapubyvu",//sol-usdc
  //     //   fromCoinMint: RaydiumProtocol.TOKENS.USDC.mintAddress,
  //     //   toCoinMint: RaydiumProtocol.NATIVE_SOL.mintAddress,
  //     //   aIn: 0.1,
  //     //   aOut: 0.000893,
  //     //   ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  //     // },
  //     // {
  //     //   lpMintAddr: "Epm4KfTj4DMrvqn6Bwg2Tr2N8vhQuNbuK8bESFp4k33K",//sol-usdt
  //     //   fromCoinMint: RaydiumProtocol.NATIVE_SOL.mintAddress,
  //     //   toCoinMint: RaydiumProtocol.TOKENS.USDT.mintAddress,
  //     //   aIn: 0.001,
  //     //   aOut: 0.135,
  //     //   ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  //     // },
  //     // {
  //     //   lpMintAddr: "7P5Thr9Egi2rvMmEuQkLn8x8e8Qro7u2U7yLD2tU2Hbe",//ray-srm
  //     //   fromCoinMint: RaydiumProtocol.TOKENS.RAY.mintAddress,
  //     //   toCoinMint: RaydiumProtocol.TOKENS.SRM.mintAddress,
  //     //   aIn: 0.001,
  //     //   aOut: 0.0017,
  //     //   ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  //     // },
  //     // {
  //     //   lpMintAddr: "AKJHspCwDhABucCxNLXUSfEzb7Ny62RqFtC9uNjJi4fq",//srm-sol
  //     //   fromCoinMint: RaydiumProtocol.TOKENS.SRM.mintAddress,
  //     //   toCoinMint: RaydiumProtocol.NATIVE_SOL.mintAddress,
  //     //   aIn: 0.1,
  //     //   aOut: 0.0021,
  //     //   ammAuthority: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  //     // }
  //   )

  //   for (var pairTokenRefer of pairTokenRefers) {
  //     pairTokenRefer.fromTokenAccount = await RaydiumProtocol.createATA(userOwner.publicKey.toBase58(), pairTokenRefer.fromCoinMint);
  //     pairTokenRefer.toTokenAccount = await RaydiumProtocol.createATA(userOwner.publicKey.toBase58(), pairTokenRefer.toCoinMint)
  //   }

  //   wsolAddress = null;
  //   for (var pairTokenRefer of pairTokenRefers) {
  //     const poolinfo = RaydiumProtocol.LIQUIDITY_POOLS.find(item => item.lp.mintAddress == pairTokenRefer.lpMintAddr);// looking for the match pool
  //     console.log("POOL:" + poolinfo.lp.mintAddress);

  //     let [tx, signers] = await RaydiumProtocol.swap({
  //       ammId: poolinfo.ammId,
  //       ammOpenOrders: poolinfo.ammOpenOrders,
  //       ammTargetOrders: poolinfo.ammTargetOrders,
  //       poolCoinTokenAccount: poolinfo.poolCoinTokenAccount,
  //       poolPcTokenAccount: poolinfo.poolPcTokenAccount,
  //       serumMarket: poolinfo.serumMarket,
  //       serumBids: poolinfo.serumBids,
  //       serumAsks: poolinfo.serumAsks,
  //       serumEventQueue: poolinfo.serumEventQueue,
  //       serumCoinVaultAccount: poolinfo.serumCoinVaultAccount,
  //       serumPcVaultAccount: poolinfo.serumPcVaultAccount,
  //       serumVaultSigner: poolinfo.serumVaultSigner,

  //       ammAuthority: pairTokenRefer.ammAuthority,
  //       userOwner: userOwner.publicKey.toBase58(),
  //       connection: CONNECTION,
  //       fromCoinMint: pairTokenRefer.fromCoinMint,//sol token address:11111111111111111111111111111111
  //       toCoinMint: pairTokenRefer.toCoinMint,
  //       fromTokenAccount: pairTokenRefer.fromTokenAccount,//be used when fromCoinMint is not native
  //       toTokenAccount: pairTokenRefer.toTokenAccount,//be used when toCoinMint is not native
  //       aIn: pairTokenRefer.aIn,
  //       aOut: pairTokenRefer.aOut,
  //       wsolAddress: wsolAddress
  //     });

  //     tx.feePayer = PAYER.publicKey;
  //     signers.push(PAYER);
  //     let txhash = await CONNECTION.sendTransaction(tx, signers);

  //     console.log("tx hash: " + txhash)
  //   }
  //   assert.isTrue(true);
  // });

  // it('harvest farms and staking token', async () => {
  //   let PAYER = Keypair.fromSecretKey(
  //     bs58.decode("4g3WTg69bHNrtD4G3fXLFXvh1mxCZrDAnUHjVQxa6dnxNKSydWY3NHstu3bgeDrW1kNuYEjAtXSKw3jsQB1aMTZ2")
  //   );
  //   let owner = PAYER;

  //   let lpMintAddrs = [];
  //   lpMintAddrs.push(
  //     {
  //       lpMintAddr : "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"//RAY , to get farmInfo
  //     },
  //     {
  //       lpMintAddr: "FbC6K13MzHvN42bXrtGaWsvZY9fxrackRSZcBGfjPc7m"//RAY-usdc (v3), to get farmInfo
  //     },
  //     {
  //       lpMintAddr: "7P5Thr9Egi2rvMmEuQkLn8x8e8Qro7u2U7yLD2tU2Hbe"//RAY-srm (v5), to get farmInfo
  //     },
  //     {
  //       lpMintAddr: "89ZKE4aoyfLBe2RuV6jM3JGNhaV18Nxh8eNtjRcndBip"//RAY-sol (v3), to get farmInfo
  //     }
  //   )

  //   for (var lpMintAddr of lpMintAddrs) {
  //     let [tx, signers] = await RaydiumProtocol.harvest(
  //       {
  //         connection: CONNECTION,
  //         owner: owner,
  //         lpMintAddr: lpMintAddr.lpMintAddr,//to get farmInfo
  //       }
  //     )
  //     tx.feePayer = PAYER.publicKey;
  //     signers.push(PAYER);
  //     let txhash = await CONNECTION.sendTransaction(tx, signers);
  //     console.log("tx hash: " + txhash)
  //   }
  // })

  it('stake farms and staking token', async () => {
    let PAYER = Keypair.fromSecretKey(
      bs58.decode("4g3WTg69bHNrtD4G3fXLFXvh1mxCZrDAnUHjVQxa6dnxNKSydWY3NHstu3bgeDrW1kNuYEjAtXSKw3jsQB1aMTZ2")
    );
    let owner = PAYER;
    
    let amount = "0.039528";
    let lpMintAddrs = [];
    lpMintAddrs.push(
      {
        lpMintAddr : "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"//RAY , to get farmInfo
      },
      // {
      //   lpMintAddr: "FbC6K13MzHvN42bXrtGaWsvZY9fxrackRSZcBGfjPc7m"//RAY-usdc (v3), to get farmInfo
      // },
      // {
      //   lpMintAddr: "7P5Thr9Egi2rvMmEuQkLn8x8e8Qro7u2U7yLD2tU2Hbe"//RAY-srm (v5), to get farmInfo
      // },
      // {
      //   lpMintAddr: "89ZKE4aoyfLBe2RuV6jM3JGNhaV18Nxh8eNtjRcndBip"//RAY-sol (v3), to get farmInfo
      // }
    )

    for (var lpMintAddr of lpMintAddrs) {
      let [tx, signers] = await RaydiumProtocol.farm(
        {
          amount:amount,
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
  })
});
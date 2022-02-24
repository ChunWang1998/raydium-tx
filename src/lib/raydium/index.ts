import { Keypair, Transaction, Connection, TransactionInstruction, PublicKey } from "@solana/web3.js";
import { TokenAmount } from './safe-math'
import { Token } from '@solana/spl-token';
import { nu64, struct, u8 } from 'buffer-layout'
import { getBigNumber, AMM_INFO_LAYOUT_V4 } from './layouts'
import { TOKEN_PROGRAM_ID, LIQUIDITY_POOL_PROGRAM_ID_V4, SERUM_PROGRAM_ID_V3, ASSOCIATED_TOKEN_PROGRAM_ID, STAKE_PROGRAM_ID } from './ids'
import { getTokenByMintAddress, NATIVE_SOL, TOKENS, TokenInfo } from './tokens'
import { closeAccount } from '@project-serum/serum/lib/token-instructions'
import {
  createAssociatedTokenAccountIfNotExist,
  createTokenAccountIfNotExist,
} from './web3'
import { LIQUIDITY_POOLS } from './pools'
import { Int } from "@solana/buffer-layout";
import BigNumber from "bignumber.js";
import { deposit, withdraw } from './stake';
import { getFarmByLpMintAddress, FarmInfo } from "./farms";

//export { TOKENS, NATIVE_SOL, LIQUIDITY_POOLS };

export const RaydiumProtocol = {
  swap,
  harvest,
  farm,
  createATA,
  TOKENS,
  NATIVE_SOL, 
  LIQUIDITY_POOLS,
}

export async function createATA(
  userOwner: string,
  toMint: string
) {
  const owner = new PublicKey(userOwner);//wallet.publicKey  
  if (toMint === NATIVE_SOL.mintAddress) {
    toMint = TOKENS.WSOL.mintAddress
  }

  const mint = new PublicKey(toMint)
  // @ts-ignore without ts ignore, yarn build will failed
  const ata = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mint, owner, true)
  return ata.toString();
}

//for SwapInsturction
export interface SwapInsturctionInterface {
  programId: PublicKey,
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammTargetOrders: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  serumProgramId: PublicKey,
  serumMarket: PublicKey,
  serumBids: PublicKey,
  serumAsks: PublicKey,
  serumEventQueue: PublicKey,
  serumCoinVaultAccount: PublicKey,
  serumPcVaultAccount: PublicKey,
  serumVaultSigner: PublicKey,
  userSourceTokenAccount: PublicKey,
  userDestTokenAccount: PublicKey,
  userOwner: PublicKey,
  amountIn: number,
  ammountOut: number
}

//for Swap
export interface SwapInterface {
  ammId: String,
  ammAuthority: String,
  ammOpenOrders: String,
  ammTargetOrders: String,
  poolCoinTokenAccount: String,
  poolPcTokenAccount: String,
  serumMarket: String,
  serumBids: String,
  serumAsks: String,
  serumEventQueue: String,
  serumCoinVaultAccount: String,
  serumPcVaultAccount: String,
  serumVaultSigner: String,
  userOwner: String,
  connection: Connection,
  fromCoinMint: string,
  toCoinMint: string,
  fromTokenAccount: string,
  toTokenAccount: string,
  aIn: string,
  aOut: string,
  wsolAddress: string | null
}

export async function swap({
  ammId: ammId,
  ammAuthority: ammAuthority,
  ammOpenOrders: ammOpenOrders,
  ammTargetOrders: ammTargetOrders,
  poolCoinTokenAccount: poolCoinTokenAccount,
  poolPcTokenAccount: poolPcTokenAccount,
  serumMarket: serumMarket,
  serumBids: serumBids,
  serumAsks: serumAsks,
  serumEventQueue: serumEventQueue,
  serumCoinVaultAccount: serumCoinVaultAccount,
  serumPcVaultAccount: serumPcVaultAccount,
  serumVaultSigner: serumVaultSigner,
  userOwner: userOwner,
  connection: connection,
  fromCoinMint: fromCoinMint,
  toCoinMint: toCoinMint,
  fromTokenAccount: fromTokenAccount,
  toTokenAccount: toTokenAccount,
  aIn: aIn,
  aOut: aOut,
  wsolAddress: wsolAddress
}: SwapInterface) {

  const transaction = new Transaction()
  const signers: Keypair[] = []

  const owner = new PublicKey(userOwner);//wallet.publicKey    

  const from = getTokenByMintAddress(fromCoinMint)
  const to = getTokenByMintAddress(toCoinMint)
  if (!from || !to) {
    throw new Error('Miss token info')
  }

  const amountIn = new TokenAmount(aIn, from.decimals, false)
  const amountOut = new TokenAmount(aOut, to.decimals, false)

  if (fromCoinMint === NATIVE_SOL.mintAddress && wsolAddress) {//預防有某些program忘記close wrap sol
    transaction.add(
      closeAccount({
        source: new PublicKey(wsolAddress),
        destination: owner,
        owner
      })
    )
  }

  //to generate UserSourceTokenAccount and UserDestTokenAccount
  let fromMint = fromCoinMint
  let toMint = toCoinMint

  if (fromMint === NATIVE_SOL.mintAddress) {
    fromMint = TOKENS.WSOL.mintAddress//So11111111111111111111111111111111111111112
  }
  if (toMint === NATIVE_SOL.mintAddress) {
    toMint = TOKENS.WSOL.mintAddress
  }

  let wrappedSolAccount: PublicKey | null = null
  let wrappedSolAccount2: PublicKey | null = null
  let newFromTokenAccount = PublicKey.default
  let newToTokenAccount = PublicKey.default

  if (fromCoinMint === NATIVE_SOL.mintAddress) {
    wrappedSolAccount = await createTokenAccountIfNotExist(
      connection,
      wrappedSolAccount,
      owner,
      TOKENS.WSOL.mintAddress,
      //getBigNumber(amountIn.wei) + 
      1e7,
      transaction,
      signers
    )
  } else {
    newFromTokenAccount = await createAssociatedTokenAccountIfNotExist(fromTokenAccount, owner, fromMint, transaction)
  }

  if (toCoinMint === NATIVE_SOL.mintAddress) {

    wrappedSolAccount2 = await createTokenAccountIfNotExist(
      connection,
      wrappedSolAccount2,
      owner,
      TOKENS.WSOL.mintAddress,
      1e7,
      transaction,
      signers
    )
  } else {
    newToTokenAccount = await createAssociatedTokenAccountIfNotExist(toTokenAccount, owner, toMint, transaction)
  }

  let swapParams: SwapInsturctionInterface = {
    programId: new PublicKey(LIQUIDITY_POOL_PROGRAM_ID_V4),
    ammId: new PublicKey(ammId),
    ammAuthority: new PublicKey(ammAuthority),
    ammOpenOrders: new PublicKey(ammOpenOrders),
    ammTargetOrders: new PublicKey(ammTargetOrders),
    poolCoinTokenAccount: new PublicKey(poolCoinTokenAccount),
    poolPcTokenAccount: new PublicKey(poolPcTokenAccount),
    serumProgramId: new PublicKey(SERUM_PROGRAM_ID_V3),
    serumMarket: new PublicKey(serumMarket),
    serumBids: new PublicKey(serumBids),
    serumAsks: new PublicKey(serumAsks),
    serumEventQueue: new PublicKey(serumEventQueue),
    serumCoinVaultAccount: new PublicKey(serumCoinVaultAccount),
    serumPcVaultAccount: new PublicKey(serumPcVaultAccount),
    serumVaultSigner: new PublicKey(serumVaultSigner),
    userSourceTokenAccount: wrappedSolAccount ?? newFromTokenAccount,
    userDestTokenAccount: wrappedSolAccount2 ?? newToTokenAccount,
    userOwner: owner,
    amountIn: Math.floor(getBigNumber(amountIn.toWei())),
    ammountOut: Math.floor(getBigNumber(amountOut.toWei()))
  }
  transaction.add(
    swapInstruction(
      swapParams
    )
  )

  if (wrappedSolAccount) {//sol->usdc
    transaction.add(
      closeAccount({
        source: wrappedSolAccount,
        destination: owner,
        owner
      })
    )
  }
  if (wrappedSolAccount2) {//usdc->sol
    transaction.add(
      closeAccount({
        source: wrappedSolAccount2,
        destination: owner,
        owner
      })
    )
  }

  return [
    transaction, signers
  ];
}

export function swapInstruction(
  swapParams: SwapInsturctionInterface
): TransactionInstruction {

  const dataLayout = struct([u8('instruction'), nu64('amountIn'), nu64('minAmountOut')])

  const keys = [
    // spl token
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    // amm
    { pubkey: swapParams.ammId, isSigner: false, isWritable: true },
    { pubkey: swapParams.ammAuthority, isSigner: false, isWritable: false },
    { pubkey: swapParams.ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: swapParams.ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: swapParams.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: swapParams.poolPcTokenAccount, isSigner: false, isWritable: true },
    // serum
    { pubkey: swapParams.serumProgramId, isSigner: false, isWritable: false },
    { pubkey: swapParams.serumMarket, isSigner: false, isWritable: true },
    { pubkey: swapParams.serumBids, isSigner: false, isWritable: true },
    { pubkey: swapParams.serumAsks, isSigner: false, isWritable: true },
    { pubkey: swapParams.serumEventQueue, isSigner: false, isWritable: true },
    { pubkey: swapParams.serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: swapParams.serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: swapParams.serumVaultSigner, isSigner: false, isWritable: false },
    { pubkey: swapParams.userSourceTokenAccount, isSigner: false, isWritable: true },
    { pubkey: swapParams.userDestTokenAccount, isSigner: false, isWritable: true },
    { pubkey: swapParams.userOwner, isSigner: true, isWritable: false }
  ]

  const data = Buffer.alloc(dataLayout.span)
  let amountIn = swapParams.amountIn
  let ammountOut = swapParams.ammountOut
  dataLayout.encode(
    {
      instruction: 9,
      amountIn,
      ammountOut
    },
    data
  )
  let programId = swapParams.programId;
  return new TransactionInstruction({
    keys,
    programId,
    data
  })
}

// export async function addLiquidity(
//   // addLiquidityInstruction input
//   //programId: String,
//   // tokenProgramId: PublicKey,
//   // amm
//   ammId: String,
//   ammAuthority: String,
//   ammOpenOrders: String,
//   ammQuantities: String,
//   poolCoinTokenAccount: String,
//   poolPcTokenAccount: String,
//   // serum
//   serumMarket: String,
//   // user
//   // userCoinTokenAccount: PublicKey,
//   // userPcTokenAccount: PublicKey,
//   //userLpTokenAccount: PublicKey,
//   userOwner: String,

//   //origin addLiquidity input
//   connection: Connection | undefined | null,
//   //wallet: any | undefined | null,
//   //poolInfo: LiquidityPoolInfo | undefined | null, 
//   //-----------part of LiquidityPoolInfo struture---------
//   coin: TokenInfo,
//   pc: TokenInfo,
//   lp: TokenInfo,
//   version: number,
//   ammTargetOrders: string,
//   //-------------------------------------------------------

//   fromCoinAccount: string | undefined | null,
//   toCoinAccount: string | undefined | null,
//   lpAccount: string | undefined | null,
//   // fromCoin: TokenInfo | undefined | null,
//   // toCoin: TokenInfo | undefined | null,
//   fromAmount: string | undefined | null,
//   toAmount: string | undefined | null,
//   fixedCoin: string
// ) {
//   if (!connection) throw new Error('Miss connection')
//   // if ( !fromCoin || !toCoin) {
//   //   throw new Error('Miss pool infomations')
//   // }
//   if (!fromCoinAccount || !toCoinAccount) {
//     throw new Error('Miss account infomations')
//   }
//   if (!fromAmount || !toAmount) {
//     throw new Error('Miss amount infomations')
//   }

//   const transaction = new Transaction()
//   const signers: any = []

//   const owner = new PublicKey(userOwner);//wallet.publicKey

//   const userAccounts = [new PublicKey(fromCoinAccount), new PublicKey(toCoinAccount)]
//   const userAmounts = [fromAmount, toAmount]

//   // if (coin.mintAddress === toCoin.mintAddress && pc.mintAddress === fromCoin.mintAddress) {
//   //   userAccounts.reverse()
//   //   userAmounts.reverse()
//   // }

//   const userCoinTokenAccount = userAccounts[0]
//   const userPcTokenAccount = userAccounts[1]
//   const coinAmount = getBigNumber(new TokenAmount(userAmounts[0], coin.decimals, false).wei)
//   const pcAmount = getBigNumber(new TokenAmount(userAmounts[1], pc.decimals, false).wei)

//   let wrappedCoinSolAccount
//   if (coin.mintAddress === NATIVE_SOL.mintAddress) {
//     wrappedCoinSolAccount = await createTokenAccountIfNotExist(
//       connection,
//       wrappedCoinSolAccount,
//       owner,
//       TOKENS.WSOL.mintAddress,
//       coinAmount + 1e7,
//       transaction,
//       signers
//     )
//   }
//   let wrappedSolAccount
//   if (pc.mintAddress === NATIVE_SOL.mintAddress) {
//     wrappedSolAccount = await createTokenAccountIfNotExist(
//       connection,
//       wrappedSolAccount,
//       owner,
//       TOKENS.WSOL.mintAddress,
//       pcAmount + 1e7,
//       transaction,
//       signers
//     )
//   }

//   let userLpTokenAccount = await createAssociatedTokenAccountIfNotExist(
//     lpAccount,
//     owner,
//     lp.mintAddress,
//     transaction
//   )

//   transaction.add(
//     [4, 5].includes(version)
//       ? addLiquidityInstructionV4(
//         new PublicKey(LIQUIDITY_POOL_PROGRAM_ID_V4),

//         new PublicKey(ammId),
//         new PublicKey(ammAuthority),
//         new PublicKey(ammOpenOrders),
//         new PublicKey(ammTargetOrders),
//         new PublicKey(lp.mintAddress),
//         new PublicKey(poolCoinTokenAccount),
//         new PublicKey(poolPcTokenAccount),

//         new PublicKey(serumMarket),

//         wrappedCoinSolAccount ? wrappedCoinSolAccount : userCoinTokenAccount,
//         wrappedSolAccount ? wrappedSolAccount : userPcTokenAccount,
//         userLpTokenAccount,
//         owner,

//         coinAmount,
//         pcAmount,
//         fixedCoin === coin.mintAddress ? 0 : 1
//       )
//       : addLiquidityInstruction(
//         new PublicKey(LIQUIDITY_POOL_PROGRAM_ID_V4),

//         new PublicKey(ammId),
//         new PublicKey(ammAuthority),
//         new PublicKey(ammOpenOrders),
//         new PublicKey(ammQuantities),
//         new PublicKey(lp.mintAddress),
//         new PublicKey(poolCoinTokenAccount),
//         new PublicKey(poolPcTokenAccount),

//         new PublicKey(serumMarket),

//         wrappedCoinSolAccount ? wrappedCoinSolAccount : userCoinTokenAccount,
//         wrappedSolAccount ? wrappedSolAccount : userPcTokenAccount,
//         userLpTokenAccount,
//         owner,

//         coinAmount,
//         pcAmount,
//         fixedCoin === coin.mintAddress ? 0 : 1
//       )
//   )

//   if (wrappedCoinSolAccount) {
//     transaction.add(
//       closeAccount({
//         source: wrappedCoinSolAccount,
//         destination: owner,
//         owner: owner
//       })
//     )
//   }
//   if (wrappedSolAccount) {
//     transaction.add(
//       closeAccount({
//         source: wrappedSolAccount,
//         destination: owner,
//         owner: owner
//       })
//     )
//   }

//   return transaction;
// }

// export function addLiquidityInstruction(
//   programId: PublicKey,
//   // tokenProgramId: PublicKey,
//   // amm
//   ammId: PublicKey,
//   ammAuthority: PublicKey,
//   ammOpenOrders: PublicKey,
//   ammQuantities: PublicKey,
//   lpMintAddress: PublicKey,
//   poolCoinTokenAccount: PublicKey,
//   poolPcTokenAccount: PublicKey,
//   // serum
//   serumMarket: PublicKey,
//   // user
//   userCoinTokenAccount: PublicKey,
//   userPcTokenAccount: PublicKey,
//   userLpTokenAccount: PublicKey,
//   userOwner: PublicKey,

//   maxCoinAmount: number,
//   maxPcAmount: number,
//   fixedFromCoin: number
// ): TransactionInstruction {
//   const dataLayout = struct([u8('instruction'), nu64('maxCoinAmount'), nu64('maxPcAmount'), nu64('fixedFromCoin')])

//   const keys = [
//     { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
//     { pubkey: ammId, isSigner: false, isWritable: true },
//     { pubkey: ammAuthority, isSigner: false, isWritable: false },
//     { pubkey: ammOpenOrders, isSigner: false, isWritable: false },
//     { pubkey: ammQuantities, isSigner: false, isWritable: true },
//     { pubkey: lpMintAddress, isSigner: false, isWritable: true },
//     { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: serumMarket, isSigner: false, isWritable: false },
//     { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: userOwner, isSigner: true, isWritable: false }
//   ]

//   const data = Buffer.alloc(dataLayout.span)
//   dataLayout.encode(
//     {
//       instruction: 3,
//       maxCoinAmount,
//       maxPcAmount,
//       fixedFromCoin
//     },
//     data
//   )

//   return new TransactionInstruction({
//     keys,
//     programId,
//     data
//   })
// }

// export function addLiquidityInstructionV4(
//   programId: PublicKey,
//   // tokenProgramId: PublicKey,
//   // amm
//   ammId: PublicKey,
//   ammAuthority: PublicKey,
//   ammOpenOrders: PublicKey,
//   ammTargetOrders: PublicKey,
//   lpMintAddress: PublicKey,
//   poolCoinTokenAccount: PublicKey,
//   poolPcTokenAccount: PublicKey,
//   // serum
//   serumMarket: PublicKey,
//   // user
//   userCoinTokenAccount: PublicKey,
//   userPcTokenAccount: PublicKey,
//   userLpTokenAccount: PublicKey,
//   userOwner: PublicKey,

//   maxCoinAmount: number,
//   maxPcAmount: number,
//   fixedFromCoin: number
// ): TransactionInstruction {
//   const dataLayout = struct([u8('instruction'), nu64('maxCoinAmount'), nu64('maxPcAmount'), nu64('fixedFromCoin')])

//   const keys = [
//     { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
//     { pubkey: ammId, isSigner: false, isWritable: true },
//     { pubkey: ammAuthority, isSigner: false, isWritable: false },
//     { pubkey: ammOpenOrders, isSigner: false, isWritable: false },
//     { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
//     { pubkey: lpMintAddress, isSigner: false, isWritable: true },
//     { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: serumMarket, isSigner: false, isWritable: false },
//     { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
//     { pubkey: userOwner, isSigner: true, isWritable: false }
//   ]

//   const data = Buffer.alloc(dataLayout.span)
//   dataLayout.encode(
//     {
//       instruction: 3,
//       maxCoinAmount,
//       maxPcAmount,
//       fixedFromCoin
//     },
//     data
//   )

//   return new TransactionInstruction({
//     keys,
//     programId,
//     data
//   })
// }

export interface HarvestInterface {
  connection: Connection,//connection
  owner: any,
  lpMintAddr: string,//farmInfo
}

export async function harvest({
  connection: connection,//connection
  owner: owner,//wallet
  lpMintAddr: lpMintAddr,//farmInfo
}: HarvestInterface) {  
  let amount = "0";
  let farmInfo: FarmInfo | undefined = getFarmByLpMintAddress(lpMintAddr);
  if (farmInfo == undefined) throw new Error("can't find farm from lpMintAddr");

  let lpAccount = await createATA(owner.publicKey.toBase58(), farmInfo.lp.mintAddress);
  let rewardAccount = await createATA(owner.publicKey.toBase58(), farmInfo.reward.mintAddress);

  //!! 可能要根據farmInfo.version 來決定要用哪一種deposit 
  return await deposit(connection, owner, farmInfo, lpAccount, rewardAccount, null, amount)
}

// stake function in raydium
export interface FarmInterface {
  amount:string,
  connection: Connection,//connection
  owner: any,
  lpMintAddr: string,//farmInfo
}

export async function farm({
  amount:amount,
  connection: connection,//connection
  owner: owner,//wallet
  lpMintAddr: lpMintAddr,//farmInfo
}: FarmInterface) {  
  let farmInfo: FarmInfo | undefined = getFarmByLpMintAddress(lpMintAddr);
  if (farmInfo == undefined) throw new Error("can't find farm from lpMintAddr");

  let lpAccount = await createATA(owner.publicKey.toBase58(), farmInfo.lp.mintAddress);
  let rewardAccount = await createATA(owner.publicKey.toBase58(), farmInfo.reward.mintAddress);

  //!! 可能要根據farmInfo.version 來決定要用哪一種deposit 
  return await deposit(connection, owner, farmInfo, lpAccount, rewardAccount, null, amount)
}
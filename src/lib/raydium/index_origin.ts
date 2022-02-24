import { Account, Keypair, Transaction, Connection, TransactionInstruction, PublicKey } from "@solana/web3.js";
import { TokenAmount } from './safe-math'
import { nu64, struct, u8 } from 'buffer-layout'
import { getBigNumber } from './layouts'
import { TOKEN_PROGRAM_ID, LIQUIDITY_POOL_PROGRAM_ID_V4, SERUM_PROGRAM_ID_V3 } from './ids'
import { getTokenByMintAddress, NATIVE_SOL, TOKENS } from './tokens'
import { closeAccount } from '@project-serum/serum/lib/token-instructions'
import {
    createAssociatedTokenAccountIfNotExist,
    createTokenAccountIfNotExist
} from './web3'

//const.ts
const ammAuthority = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';

export async function swap(
    connection: Connection,

    //for swapinstruction
    //programId: String,
    // tokenProgramId: PublicKey,
    // amm
    ammId: String,
    //ammAuthority: String,
    ammOpenOrders: String,
    ammTargetOrders: String,
    poolCoinTokenAccount: String,
    poolPcTokenAccount: String,
    // serum
    //serumProgramId: String,
    serumMarket: String,
    serumBids: String,
    serumAsks: String,
    serumEventQueue: String,
    serumCoinVaultAccount: String,
    serumPcVaultAccount: String,
    serumVaultSigner: String,
    // user
    //userSourceTokenAccount: String,
    //userDestTokenAccount: String,
    userOwner: String,
    //minAmountOut: number,

    fromCoinMint: string,//tokenA
    toCoinMint: string,//tokenB
    fromTokenAccount: string,
    toTokenAccount: string,
    aIn: string,
    aOut: string,
    wsolAddress: string | null = null
) {
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
        fromMint = TOKENS.WSOL.mintAddress
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
            getBigNumber(amountIn.wei) + 1e7,
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

    transaction.add(
        swapInstruction(
            new PublicKey(LIQUIDITY_POOL_PROGRAM_ID_V4),
            new PublicKey(ammId),
            new PublicKey(ammAuthority),
            new PublicKey(ammOpenOrders),
            new PublicKey(ammTargetOrders),
            new PublicKey(poolCoinTokenAccount),
            new PublicKey(poolPcTokenAccount),
            new PublicKey(SERUM_PROGRAM_ID_V3),
            new PublicKey(serumMarket),
            new PublicKey(serumBids),
            new PublicKey(serumAsks),
            new PublicKey(serumEventQueue),
            new PublicKey(serumCoinVaultAccount),
            new PublicKey(serumPcVaultAccount),
            new PublicKey(serumVaultSigner),
            wrappedSolAccount ?? newFromTokenAccount,
            wrappedSolAccount2 ?? newToTokenAccount,
            owner,
            Math.floor(getBigNumber(amountIn.toWei())),
            Math.floor(getBigNumber(amountOut.toWei()))
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
    return transaction;
}

export function swapInstruction(
    programId: PublicKey,
    // tokenProgramId: PublicKey,
    // amm
    ammId: PublicKey,
    ammAuthority: PublicKey,
    ammOpenOrders: PublicKey,
    ammTargetOrders: PublicKey,
    poolCoinTokenAccount: PublicKey,
    poolPcTokenAccount: PublicKey,
    // serum
    serumProgramId: PublicKey,
    serumMarket: PublicKey,
    serumBids: PublicKey,
    serumAsks: PublicKey,
    serumEventQueue: PublicKey,
    serumCoinVaultAccount: PublicKey,
    serumPcVaultAccount: PublicKey,
    serumVaultSigner: PublicKey,
    // user
    userSourceTokenAccount: PublicKey,
    userDestTokenAccount: PublicKey,
    userOwner: PublicKey,

    amountIn: number,
    minAmountOut: number
): TransactionInstruction {
    const dataLayout = struct([u8('instruction'), nu64('amountIn'), nu64('minAmountOut')])

    const keys = [
        // spl token
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        // amm
        { pubkey: ammId, isSigner: false, isWritable: true },
        { pubkey: ammAuthority, isSigner: false, isWritable: false },
        { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
        { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
        { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
        // serum
        { pubkey: serumProgramId, isSigner: false, isWritable: false },
        { pubkey: serumMarket, isSigner: false, isWritable: true },
        { pubkey: serumBids, isSigner: false, isWritable: true },
        { pubkey: serumAsks, isSigner: false, isWritable: true },
        { pubkey: serumEventQueue, isSigner: false, isWritable: true },
        { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
        { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
        { pubkey: serumVaultSigner, isSigner: false, isWritable: false },
        { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userDestTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userOwner, isSigner: true, isWritable: false }
    ]

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
        {
            instruction: 9,
            amountIn,
            minAmountOut
        },
        data
    )

    return new TransactionInstruction({
        keys,
        programId,
        data
    })
}

export function addLiquidityInstructionV4(
    programId: PublicKey,
    // tokenProgramId: PublicKey,
    // amm
    ammId: PublicKey,
    ammAuthority: PublicKey,
    ammOpenOrders: PublicKey,
    ammTargetOrders: PublicKey,
    lpMintAddress: PublicKey,
    poolCoinTokenAccount: PublicKey,
    poolPcTokenAccount: PublicKey,
    // serum
    serumMarket: PublicKey,
    // user
    userCoinTokenAccount: PublicKey,
    userPcTokenAccount: PublicKey,
    userLpTokenAccount: PublicKey,
    userOwner: PublicKey,

    maxCoinAmount: number,
    maxPcAmount: number,
    fixedFromCoin: number
): TransactionInstruction {
    const dataLayout = struct([u8('instruction'), nu64('maxCoinAmount'), nu64('maxPcAmount'), nu64('fixedFromCoin')])

    const keys = [
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ammId, isSigner: false, isWritable: true },
        { pubkey: ammAuthority, isSigner: false, isWritable: false },
        { pubkey: ammOpenOrders, isSigner: false, isWritable: false },
        { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
        { pubkey: lpMintAddress, isSigner: false, isWritable: true },
        { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
        { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
        { pubkey: serumMarket, isSigner: false, isWritable: false },
        { pubkey: userCoinTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userPcTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userLpTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userOwner, isSigner: true, isWritable: false }
    ]

    const data = Buffer.alloc(dataLayout.span)
    dataLayout.encode(
        {
            instruction: 3,
            maxCoinAmount,
            maxPcAmount,
            fixedFromCoin
        },
        data
    )

    return new TransactionInstruction({
        keys,
        programId,
        data
    })
}

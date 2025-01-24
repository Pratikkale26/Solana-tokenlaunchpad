
import { createAssociatedTokenAccountInstruction, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, createMintToInstruction, ExtensionType, getAssociatedTokenAddressSync, getMintLen, LENGTH_SIZE, TOKEN_2022_PROGRAM_ID, TYPE_SIZE } from "@solana/spl-token";
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { useState } from "react";

export function TokenLaunchPad() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [tokenName, setTokenName] = useState<string>("");
    const [tokenSymbol, setTokenSymbol] = useState<string>("");
    const [tokenImageUrl, setTokenImageUrl] = useState<string>("");
    const [initialSupply, setInitialSupply] = useState<string>("");

    // create a new token
    async function createToken() {
        if (!wallet.publicKey) {
            alert("Please connect your wallet first.");
            return;
        }

        // Validate inputs
        if (!tokenName || !tokenSymbol || !tokenImageUrl || !initialSupply) {
            alert("Please fill in all fields.");
            return;
        }

        // new keypair for the token mint
        const mintKeypair = Keypair.generate();

        // metadata for the token
        const metadata = {
            mint: mintKeypair.publicKey,
            name: tokenName,
            symbol: tokenSymbol,
            uri: tokenImageUrl,
            additionalMetadata: [],
        };

        //  required space for the mint and metadata
        const mintLen = getMintLen([ExtensionType.MetadataPointer]);
        const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

        // minimum lamports required for rent exemption
        const lamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

        // a new transaction to initialize the token
        const transaction = new Transaction().add(
            SystemProgram.createAccount({             //  new account for the mint
                fromPubkey: wallet.publicKey,
                newAccountPubkey: mintKeypair.publicKey,
                space: mintLen,
                lamports,
                programId: TOKEN_2022_PROGRAM_ID,
            }),


            createInitializeMetadataPointerInstruction(mintKeypair.publicKey, wallet.publicKey, mintKeypair.publicKey, TOKEN_2022_PROGRAM_ID),

            createInitializeMintInstruction(mintKeypair.publicKey, 9, wallet.publicKey, null, TOKEN_2022_PROGRAM_ID),
            
            createInitializeInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                mint: mintKeypair.publicKey,
                metadata: mintKeypair.publicKey,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                mintAuthority: wallet.publicKey,
                updateAuthority: wallet.publicKey,
            })
        );

        
        transaction.feePayer = wallet.publicKey; // this guy will pay the fee
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        transaction.partialSign(mintKeypair); // partially signs the transaction with the mint keypair

        await wallet.sendTransaction(transaction, connection);

        console.log(`Token mint created at ${mintKeypair.publicKey.toBase58()}`);

        // then create associated token account for the wallet
        const associatedToken = getAssociatedTokenAddressSync(
            mintKeypair.publicKey,
            wallet.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID
        );

        console.log(`Associated Token Account: ${associatedToken.toBase58()}`);

        const transaction2 = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                wallet.publicKey,
                associatedToken,
                wallet.publicKey,
                mintKeypair.publicKey,
                TOKEN_2022_PROGRAM_ID,
            )
        );

        await wallet.sendTransaction(transaction2, connection);

        // mint tokens to the associated token account
        const transaction3 = new Transaction().add(
            createMintToInstruction(
                mintKeypair.publicKey,
                associatedToken,
                wallet.publicKey,
                Number(initialSupply) * Math.pow(10, 9), // converts to lamports
                [],
                TOKEN_2022_PROGRAM_ID
            )
        );

        await wallet.sendTransaction(transaction3, connection);

        console.log("Tokens minted successfully!");
    }

    return (
        <div className="flex flex-col items-center justify-center bg-gray-100 p-4">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">
                LAUNCH YOUR TOKEN
            </h1>
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <input
                    type="text"
                    className="w-full p-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Token Name"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                />
                <input
                    type="text"
                    className="w-full p-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Token Symbol"
                    value={tokenSymbol}
                    onChange={(e) => setTokenSymbol(e.target.value)}
                />
                <input
                    type="text"
                    className="w-full p-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Image URL"
                    value={tokenImageUrl}
                    onChange={(e) => setTokenImageUrl(e.target.value)}
                />
                <input
                    type="number"
                    className="w-full p-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Initial Supply"
                    value={initialSupply}
                    onChange={(e) => setInitialSupply(e.target.value)}
                />
                <button
                    onClick={createToken}
                    className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200"
                >
                    Create Token
                </button>
            </div>
        </div>
    );
}
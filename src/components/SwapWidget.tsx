import { useMemo, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { JupiterProvider, useJupiter } from "@jup-ag/react-hook";
import { Connection, PublicKey } from "@solana/web3.js";
import { TokenListProvider, TokenInfo } from "@solana/spl-token-registry";

const RPC_ENDPOINT = "https://api.devnet.solana.com";

// Common Solana tokens on devnet
const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_DEVNET_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

interface SwapStats {
  inAmount: number;
  outAmount: number;
  priceImpact: number;
  fee: number;
}

const JupiterSwap = () => {
  const { publicKey, sendTransaction } = useWallet();
  const connection = useMemo(() => new Connection(RPC_ENDPOINT), []);

  // Token states
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  const [inputMint, setInputMint] = useState(new PublicKey(WRAPPED_SOL_MINT));
  const [outputMint, setOutputMint] = useState(new PublicKey(USDC_DEVNET_MINT));
  const [inputTokenInfo, setInputTokenInfo] = useState<TokenInfo | null>(null);
  const [outputTokenInfo, setOutputTokenInfo] = useState<TokenInfo | null>(null);
  
  // Amount states
  const [inputAmount, setInputAmount] = useState("0.01");
  const [outputAmount, setOutputAmount] = useState("");
  
  // Transaction states
  const [slippage, setSlippage] = useState(1); // 1% default slippage
  const [swapping, setSwapping] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [swapStats, setSwapStats] = useState<SwapStats | null>(null);

  // Load token list
  useEffect(() => {
    new TokenListProvider().resolve().then(tokens => {
      const tokenList = tokens.filterByClusterSlug('devnet').getList();
      
      // Create a map of token addresses to token info
      const tokenMapData = tokenList.reduce((map, item) => {
        map.set(item.address, item);
        return map;
      }, new Map<string, TokenInfo>());
      
      setTokenMap(tokenMapData);
      
      // Set initial token info
      const solToken = tokenMapData.get(WRAPPED_SOL_MINT);
      const usdcToken = tokenMapData.get(USDC_DEVNET_MINT);
      
      if (solToken) setInputTokenInfo(solToken);
      if (usdcToken) setOutputTokenInfo(usdcToken);
    });
  }, []);

  // Calculate actual amount in lamports based on token decimals
  const amountInLamports = useMemo(() => {
    if (!inputTokenInfo || !inputAmount) return 0;
    try {
      const floatAmount = parseFloat(inputAmount);
      return floatAmount * 10 ** inputTokenInfo.decimals;
    } catch (e) {
      return 0;
    }
  }, [inputAmount, inputTokenInfo]);

  // Jupiter integration
  const {
    routes,
    loading,
    exchange,
    error,
    refresh,
  } = useJupiter({
    amount: amountInLamports,
    inputMint,
    outputMint,
    slippage,
    debounceTime: 250,
    forceFetch: true,
  });

  const bestRoute = routes?.[0];

  // Update output amount when route changes
  useEffect(() => {
    if (bestRoute && outputTokenInfo) {
      const outAmount = bestRoute.outAmount / 10 ** outputTokenInfo.decimals;
      setOutputAmount(outAmount.toFixed(outputTokenInfo.decimals));
      
      // Calculate and set swap stats
      setSwapStats({
        inAmount: amountInLamports / 10 ** (inputTokenInfo?.decimals || 9),
        outAmount,
        priceImpact: bestRoute.priceImpactPct,
        fee: bestRoute.totalFeeAndDeposits / 10 ** (inputTokenInfo?.decimals || 9),
      });
    } else {
      setOutputAmount("");
      setSwapStats(null);
    }
  }, [bestRoute, outputTokenInfo, inputTokenInfo, amountInLamports]);

  // Handle token selection changes
  const handleInputTokenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMint = new PublicKey(e.target.value);
    setInputMint(newMint);
    setInputTokenInfo(tokenMap.get(e.target.value) || null);
  };

  const handleOutputTokenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMint = new PublicKey(e.target.value);
    setOutputMint(newMint);
    setOutputTokenInfo(tokenMap.get(e.target.value) || null);
  };

  // Handle the swap execution
  const handleSwap = async () => {
    if (!bestRoute || !publicKey) return;
    
    try {
      setSwapping(true);
      
      const { txid } = await exchange({ routeInfo: bestRoute });
      setTxSignature(txid);
      
      // Wait for confirmation
      const status = await connection.confirmTransaction(txid, "confirmed");
      
      if (status.value.err) {
        throw new Error("Transaction failed to confirm");
      }
    } catch (err) {
      console.error("Swap failed:", err);
      alert(`Swap failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSwapping(false);
    }
  };

  // Handle input token max
  const handleMax = async () => {
    if (!publicKey || !inputTokenInfo) return;
    
    try {
      // For SOL, we need to leave some for transaction fees
      if (inputMint.toString() === WRAPPED_SOL_MINT) {
        const balance = await connection.getBalance(publicKey);
        // Leave 0.01 SOL for fees
        const availableBalance = Math.max(0, (balance - 0.01 * 10 ** 9) / 10 ** 9);
        setInputAmount(availableBalance.toFixed(9));
      } else {
        // For other tokens, we would need to fetch token account balance
        // This is simplified for this example
        // In a real app, you'd need to find the associated token account and get its balance
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Solana DEX Aggregator</h2>
      
      {/* Input section */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">You pay</label>
          <button 
            onClick={handleMax} 
            className="text-xs text-blue-600 hover:text-blue-800"
            disabled={!publicKey}
          >
            MAX
          </button>
        </div>
        
        <div className="flex gap-2">
          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            className="flex-grow p-3 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            min="0"
            step="0.000001"
          />
          
          <select
            value={inputMint.toString()}
            onChange={handleInputTokenChange}
            className="p-3 rounded border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from(tokenMap.values()).map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Swap direction arrow */}
      <div className="flex justify-center mb-4">
        <button 
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
          onClick={() => {
            // Swap input and output tokens
            const tempMint = inputMint;
            const tempTokenInfo = inputTokenInfo;
            
            setInputMint(outputMint);
            setInputTokenInfo(outputTokenInfo);
            
            setOutputMint(tempMint);
            setOutputTokenInfo(tempTokenInfo);
            
            // Reset amounts
            setInputAmount("0.01");
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>
      
      {/* Output section */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <label className="text-sm font-medium text-gray-700 mb-2 block">You receive</label>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={outputAmount}
            className="flex-grow p-3 rounded border bg-gray-100"
            placeholder="0.00"
            disabled
          />
          
          <select
            value={outputMint.toString()}
            onChange={handleOutputTokenChange}
            className="p-3 rounded border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from(tokenMap.values()).map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Swap info */}
      {swapStats && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Rate</span>
            <span className="font-medium">
              1 {inputTokenInfo?.symbol} ≈ {(swapStats.outAmount / swapStats.inAmount).toFixed(6)} {outputTokenInfo?.symbol}
            </span>
          </div>
          
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Price Impact</span>
            <span className={`font-medium ${swapStats.priceImpact > 5 ? 'text-red-600' : 'text-gray-800'}`}>
              {swapStats.priceImpact.toFixed(2)}%
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Network Fee</span>
            <span className="font-medium">{swapStats.fee.toFixed(5)} {inputTokenInfo?.symbol}</span>
          </div>
        </div>
      )}
      
      {/* Slippage settings */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Slippage Tolerance</label>
        <div className="flex gap-2">
          {[0.5, 1, 2, 3].map((value) => (
            <button
              key={value}
              className={`py-1 px-3 rounded ${
                slippage === value ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setSlippage(value)}
            >
              {value}%
            </button>
          ))}
          
          <div className="relative flex-grow">
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value))}
              className="w-full p-1 pl-2 pr-8 rounded border"
              min="0.1"
              max="50"
              step="0.1"
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
          </div>
        </div>
      </div>
      
      {/* Transaction buttons */}
      <div className="space-y-3">
        <button
          onClick={handleSwap}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!bestRoute || swapping || !publicKey || amountInLamports <= 0}
        >
          {!publicKey ? "Connect Wallet" : 
           swapping ? "Swapping..." : 
           loading ? "Finding Routes..." :
           !bestRoute ? "Insufficient Liquidity" :
           `Swap ${inputTokenInfo?.symbol} to ${outputTokenInfo?.symbol}`}
        </button>
        
        <button
          onClick={refresh}
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg"
          disabled={loading || swapping}
        >
          Refresh Rate
        </button>
      </div>
      
      {/* Transaction status */}
      {txSignature && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">Swap successful!</p>
          <div className="flex items-center mt-1">
            <span className="text-sm text-gray-600 mr-2">Transaction:</span>
            <a 
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 truncate"
            >
              {txSignature.slice(0, 8)}...{txSignature.slice(-8)}
            </a>
            <button 
              onClick={() => navigator.clipboard.writeText(txSignature)}
              className="ml-2 p-1 text-gray-500 hover:text-gray-700"
              title="Copy to clipboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error: {error.message}</p>
        </div>
      )}
    </div>
  );
};

export default function SwapWidgetWrapper() {
  const wallet = useWallet();
  const connection = useMemo(() => new Connection(RPC_ENDPOINT), []);
  
  return (
    <JupiterProvider 
      connection={connection} 
      cluster="devnet" 
      userPublicKey={wallet.publicKey}
    >
      <JupiterSwap />
    </JupiterProvider>
  );
}
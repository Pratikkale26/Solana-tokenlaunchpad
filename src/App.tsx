import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletDisconnectButton, WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import '@solana/wallet-adapter-react-ui/styles.css';
import { TokenLaunchPad } from "./components/TokenLaunchPad";
import WalletControls from "./components/PasskeyButton";
import SwapWidgetWrapper from "./components/SwapWidget";



function App() {

  return (
    <div className="h-screen w-screen bg-gray-100 p-4">
      <ConnectionProvider endpoint="https://api.devnet.solana.com">
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>
            {/* Top navbar */}
            <div className="flex justify-between items-center mb-8 p-4 bg-white rounded-lg shadow-md">
              <h1 className="text-2xl font-bold text-gray-800 ml-10">
                Solana Token Launchpad
              </h1>

              <div className="flex items-center gap-4 mr-10">
                {/* Wallet Buttons */}
                <WalletMultiButton className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm" />
                <WalletDisconnectButton className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm" />

                {/* Your Passkey Button (WalletControls) */}
                <div className="ml-4">
                  <WalletControls />
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
              <TokenLaunchPad />
            </div>
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
              <SwapWidgetWrapper />
            </div>
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
}

export default App

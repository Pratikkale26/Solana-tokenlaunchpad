import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletDisconnectButton, WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import '@solana/wallet-adapter-react-ui/styles.css';
import { TokenLaunchPad } from "./components/TokenLaunchPad";



function App() {

  return (
    <div className="h-screen w-screen bg-gray-100 p-4">
      <ConnectionProvider endpoint="https://api.devnet.solana.com">
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>

            <div className="flex justify-between items-center mb-8 p-4 bg-white rounded-lg shadow-md">
              <h1 className="text-2xl font-bold text-gray-800 ml-10">Solana Token Launchpad</h1>
              <div className="flex gap-2 mr-10">
                <WalletMultiButton className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg" />
                <WalletDisconnectButton className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg" />
              </div>
            </div>

            <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
              <TokenLaunchPad />
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  )
}

export default App

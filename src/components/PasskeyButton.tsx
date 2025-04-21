import { useWallet } from '@lazorkit/wallet';
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');

function WalletControls() {
  const { connect, disconnect, isConnected, publicKey } = useWallet(connection);

  return (
    <div className="flex items-center gap-2">
      {!isConnected ? (
        <button
          onClick={connect}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm"
        >
          Passkey Connect
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 font-medium bg-gray-200 px-3 py-1 rounded-full truncate max-w-[120px]">
            {publicKey}
          </span>
          <button
            onClick={disconnect}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm"
          >
            Passkey Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default WalletControls;

import React, { useState, useEffect, useMemo, useRef } from 'https://unpkg.com/react@18/umd/react.development.js';
import ReactDOM from 'https://unpkg.com/react-dom@18/umd/react-dom.development.js';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from 'https://unpkg.com/@solana/wallet-adapter-react@latest/dist/umd/index.min.js';
import { WalletModalProvider, WalletMultiButton } from 'https://unpkg.com/@solana/wallet-adapter-react-ui@latest/dist/umd/index.min.js';
import { PhantomWalletAdapter, SolflareWalletAdapter } from 'https://unpkg.com/@solana/wallet-adapter-wallets@latest/dist/umd/index.min.js';
import { clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from 'https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js';
import { getAssociatedTokenAddressSync } from 'https://unpkg.com/@solana/spl-token@latest/lib/index.iife.min.js';

// Constants for SOL to USDC swap (user said SOL to USD, using USDC as stable)
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const network = 'mainnet-beta';
const endpoint = clusterApiUrl(network);

const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })];

function SpotInterface() {
    const { connection } = useConnection();
    const { publicKey, connected, signTransaction, sendTransaction } = useWallet();
    const [side, setSide] = useState('buy'); // buy: SOL -> USDC, sell: USDC -> SOL
    const [inputAmount, setInputAmount] = useState('');
    const [outputAmount, setOutputAmount] = useState('');
    const [slippage, setSlippage] = useState(1);
    const [balanceSOL, setBalanceSOL] = useState(0);
    const [balanceUSDC, setBalanceUSDC] = useState(0);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState('');

    // Fetch balances
    useEffect(() => {
        if (connected && publicKey) {
            connection.getBalance(publicKey).then(b => setBalanceSOL(b / LAMPORTS_PER_SOL));
            const usdcMint = new PublicKey(USDC_MINT);
            getAssociatedTokenAddressSync(usdcMint, publicKey).then(ata => {
                connection.getTokenAccountBalance(ata).then(tb => setBalanceUSDC(tb.value.uiAmount || 0)).catch(() => setBalanceUSDC(0));
            }).catch(() => setBalanceUSDC(0));
        }
    }, [connected, publicKey, connection]);

    // Quote
    const getQuote = async (amount) => {
        if (!amount) return;
        const inputMint = side === 'buy' ? SOL_MINT : USDC_MINT;
        const outputMint = side === 'buy' ? USDC_MINT : SOL_MINT;
        const decimals = side === 'buy' ? 9 : 6;
        const amountIn = Math.floor(parseFloat(amount) * 10 ** decimals);
        const params = new URLSearchParams({
            inputMint,
            outputMint,
            amount: amountIn.toString(),
            slippageBps: (slippage * 100).toString(),
        });
        const res = await fetch(`https://quote-api.jup.ag/v6/quote?${params}`);
        if (!res.ok) throw new Error('Quote failed');
        return res.json();
    };

    useEffect(() => {
        if (!inputAmount) {
            setOutputAmount('');
            return;
        }
        const timer = setTimeout(async () => {
            setIsFetching(true);
            try {
                const quote = await getQuote(inputAmount);
                const outDecimals = side === 'buy' ? 6 : 9;
                setOutputAmount((parseFloat(quote.outAmount) / 10 ** outDecimals).toFixed(6));
                setError('');
            } catch (e) {
                setError(e.message);
                setOutputAmount('');
            }
            setIsFetching(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [inputAmount, side, slippage]);

    const executeSwap = async () => {
        if (!connected || !inputAmount) return;
        try {
            const quote = await getQuote(inputAmount);
            const res = await fetch('https://quote-api.jup.ag/v6/swap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quoteResponse: quote,
                    userPublicKey: publicKey.toString(),
                    wrapAndUnwrapSol: true,
                }),
            });
            const { swapTransaction } = await res.json();
            const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(swapTransaction), c => c.charCodeAt(0)));
            const signed = await signTransaction(tx);
            const sig = await connection.sendRawTransaction(signed.serialize());
            await connection.confirmTransaction(sig);
            alert('Swap successful! ' + sig);
            setInputAmount('');
        } catch (e) {
            alert('Swap failed: ' + e.message);
        }
    };

    const inputBalance = side === 'buy' ? balanceSOL : balanceUSDC;
    const outputSymbol = side === 'buy' ? 'USDC' : 'SOL';
    const inputSymbol = side === 'buy' ? 'SOL' : 'USDC';

    return (
        <div className="spot-interface">
            <div className="wallet-connect">
                <WalletMultiButton />
            </div>
            <div className="amount-input">
                <label>{inputSymbol} Amount</label>
                <input type="number" value={inputAmount} onChange={e => setInputAmount(e.target.value)} placeholder="0.0" />
                <button onClick={() => setInputAmount(inputBalance.toFixed(6))}>Max</button>
                <div>Balance: {inputBalance.toFixed(4)} {inputSymbol}</div>
            </div>
            <div className="slippage">
                <label>Slippage %</label>
                <input type="number" value={slippage} onChange={e => setSlippage(parseFloat(e.target.value) || 1)} min="0.1" step="0.1" />
            </div>
            {isFetching && <div>Loading quote...</div>}
            {outputAmount && <div>Output: {outputAmount} {outputSymbol}</div>}
            {error && <div className="error">{error}</div>}
            <button onClick={executeSwap} disabled={!connected || !inputAmount || parseFloat(inputAmount) > inputBalance}>
                {side === 'buy' ? 'Buy USDC with SOL' : 'Sell USDC for SOL'}
            </button>
        </div>
    );
}

function App() {
    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <SpotInterface />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

ReactDOM.createRoot(document.getElementById('spot-interface')).render(<App />);
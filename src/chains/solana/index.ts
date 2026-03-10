import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedAccountData } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Token, NFT, Transaction, DeFiPosition, WalletPortfolio } from '../../types';

// Multi-RPC endpoints for reliability
const RPC_ENDPOINTS = [
  import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://rpc.ankr.com/solana',
];

let currentEndpoint = 0;

export const getConnection = (): Connection => {
  return new Connection(RPC_ENDPOINTS[currentEndpoint], {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
};

export const rotateEndpoint = (): void => {
  currentEndpoint = (currentEndpoint + 1) % RPC_ENDPOINTS.length;
};

// Fetch SOL balance
export const getSolBalance = async (address: string): Promise<number> => {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Solana balance error:', error);
    rotateEndpoint();
    throw error;
  }
};

// Fetch all SPL tokens with metadata
export const getSolanaTokens = async (address: string): Promise<Token[]> => {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(address);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    const tokens: Token[] = [];

    // Fetch token list for metadata
    const tokenListResponse = await fetch('https://token.jup.ag/strict');
    const tokenList = await tokenListResponse.json();
    const tokenMap = new Map(tokenList.map((t: any) => [t.address, t]));

    // Batch price fetch from Jupiter
    const mints = tokenAccounts.value
      .map((acc) => (acc.account.data as ParsedAccountData).parsed.info.mint)
      .join(',');

    let prices: Record<string, number> = {};
    if (mints) {
      try {
        const priceResponse = await fetch(`https://price.jup.ag/v6/price?ids=${mints}`);
        const priceData = await priceResponse.json();
        prices = Object.fromEntries(
          Object.entries(priceData.data || {}).map(([k, v]: [string, any]) => [k, v.price || 0])
        );
      } catch (e) {
        console.warn('Price fetch failed:', e);
      }
    }

    for (const account of tokenAccounts.value) {
      const parsedInfo = (account.account.data as ParsedAccountData).parsed.info;
      const balance = parsedInfo.tokenAmount.uiAmount;

      if (balance && balance > 0) {
        const mint = parsedInfo.mint;
        const metadata = tokenMap.get(mint) as any;
        const price = prices[mint] || 0;

        tokens.push({
          address: mint,
          symbol: metadata?.symbol || 'Unknown',
          name: metadata?.name || 'Unknown Token',
          decimals: parsedInfo.tokenAmount.decimals,
          balance: balance.toString(),
          balanceUsd: balance * price,
          price,
          priceChange24h: 0, // Would need CoinGecko for this
          logoUrl: metadata?.logoURI,
          chain: 'solana',
        });
      }
    }

    return tokens.sort((a, b) => b.balanceUsd - a.balanceUsd);
  } catch (error) {
    console.error('Solana tokens error:', error);
    rotateEndpoint();
    throw error;
  }
};

// Fetch NFTs using Helius DAS API
export const getSolanaNFTs = async (address: string): Promise<NFT[]> => {
  const heliusKey = import.meta.env.VITE_HELIUS_API_KEY;
  if (!heliusKey) return [];

  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'nfts',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: address,
          page: 1,
          limit: 100,
          displayOptions: {
            showFungible: false,
            showNativeBalance: false,
          },
        },
      }),
    });

    const data = await response.json();
    const nfts: NFT[] = [];

    for (const asset of data.result?.items || []) {
      if (asset.interface === 'V1_NFT' || asset.interface === 'ProgrammableNFT') {
        nfts.push({
          tokenId: asset.id,
          contractAddress: asset.grouping?.find((g: any) => g.group_key === 'collection')?.group_value || '',
          name: asset.content?.metadata?.name || 'Unknown NFT',
          description: asset.content?.metadata?.description,
          imageUrl: asset.content?.files?.[0]?.uri || asset.content?.links?.image || '',
          collection: {
            name: asset.content?.metadata?.collection?.name || 'Unknown Collection',
            floorPrice: undefined,
          },
          chain: 'solana',
          attributes: asset.content?.metadata?.attributes || [],
        });
      }
    }

    return nfts;
  } catch (error) {
    console.error('Solana NFTs error:', error);
    return [];
  }
};

// Fetch transaction history
export const getSolanaTransactions = async (address: string, limit = 50): Promise<Transaction[]> => {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(address);

    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });
    const transactions: Transaction[] = [];

    // Batch fetch transactions
    const txs = await connection.getParsedTransactions(
      signatures.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0 }
    );

    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const sig = signatures[i];

      if (!tx) continue;

      let type: Transaction['type'] = 'contract';
      let value = '0';
      let tokenSymbol = 'SOL';
      let tokenAddress = 'So11111111111111111111111111111111111111112';

      // Parse instruction type
      const instruction = tx.transaction.message.instructions[0];
      if ('parsed' in instruction) {
        const parsed = instruction.parsed;
        if (parsed.type === 'transfer') {
          type = parsed.info.destination === address ? 'receive' : 'send';
          value = (parsed.info.lamports / LAMPORTS_PER_SOL).toString();
        } else if (parsed.type === 'transferChecked') {
          type = parsed.info.destination === address ? 'receive' : 'send';
          value = parsed.info.tokenAmount.uiAmount?.toString() || '0';
          tokenAddress = parsed.info.mint;
        }
      }

      transactions.push({
        hash: sig.signature,
        chain: 'solana',
        timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
        from: tx.transaction.message.accountKeys[0].pubkey.toString(),
        to: tx.transaction.message.accountKeys[1]?.pubkey.toString() || '',
        value,
        valueUsd: 0, // Would need to calculate
        token: {
          symbol: tokenSymbol,
          address: tokenAddress,
          decimals: 9,
        },
        type,
        status: tx.meta?.err ? 'failed' : 'success',
        fee: ((tx.meta?.fee || 0) / LAMPORTS_PER_SOL).toString(),
        feeUsd: 0,
      });
    }

    return transactions;
  } catch (error) {
    console.error('Solana transactions error:', error);
    rotateEndpoint();
    throw error;
  }
};

// Fetch DeFi positions from major Solana protocols
export const getSolanaDefiPositions = async (address: string): Promise<DeFiPosition[]> => {
  const positions: DeFiPosition[] = [];

  // Marinade staking check
  try {
    const connection = getConnection();
    const marinadeProgram = new PublicKey('MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD');
    
    const accounts = await connection.getProgramAccounts(marinadeProgram, {
      filters: [
        { dataSize: 1000 }, // Approximate stake account size
        { memcmp: { offset: 8, bytes: address } },
      ],
    });

    if (accounts.length > 0) {
      positions.push({
        protocol: 'Marinade',
        protocolLogo: 'https://marinade.finance/favicon.ico',
        chain: 'solana',
        type: 'staking',
        tokens: [{ symbol: 'mSOL', balance: '0', valueUsd: 0 }],
        totalValueUsd: 0,
        apy: 7.2,
      });
    }
  } catch (e) {
    // Silent fail for DeFi position checks
  }

  return positions;
};

// Get full Solana portfolio
export const getSolanaPortfolio = async (address: string): Promise<WalletPortfolio> => {
  const [solBalance, tokens, nfts, transactions, defiPositions] = await Promise.all([
    getSolBalance(address),
    getSolanaTokens(address),
    getSolanaNFTs(address),
    getSolanaTransactions(address, 20),
    getSolanaDefiPositions(address),
  ]);

  // Get SOL price
  let solPrice = 0;
  try {
    const priceRes = await fetch(
      'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112'
    );
    const priceData = await priceRes.json();
    solPrice = priceData.data?.['So11111111111111111111111111111111111111112']?.price || 0;
  } catch (e) {
    console.warn('SOL price fetch failed');
  }

  const nativeBalanceUsd = solBalance * solPrice;
  const tokensValueUsd = tokens.reduce((sum, t) => sum + t.balanceUsd, 0);
  const defiValueUsd = defiPositions.reduce((sum, p) => sum + p.totalValueUsd, 0);

  return {
    address,
    chain: 'solana',
    nativeBalance: solBalance.toString(),
    nativeBalanceUsd,
    tokens,
    nfts,
    transactions,
    defiPositions,
    totalValueUsd: nativeBalanceUsd + tokensValueUsd + defiValueUsd,
  };
};

// Validate Solana address
export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

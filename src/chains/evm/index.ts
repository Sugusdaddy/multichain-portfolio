import { ethers } from 'ethers';
import { Token, NFT, Transaction, DeFiPosition, WalletPortfolio, ChainId, CHAINS } from '../../types';

// ERC20 ABI for token balance queries
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

// Get provider for EVM chain
export const getProvider = (chainId: ChainId): ethers.JsonRpcProvider => {
  const chain = CHAINS[chainId];
  if (!chain.isEVM) throw new Error(`${chainId} is not an EVM chain`);
  
  const rpcUrl = import.meta.env[`VITE_${chainId.toUpperCase()}_RPC`] || chain.rpcUrl;
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Get native balance (ETH, MATIC, BNB, etc.)
export const getEvmNativeBalance = async (
  address: string,
  chainId: ChainId
): Promise<{ balance: string; balanceUsd: number }> => {
  const provider = getProvider(chainId);
  const balance = await provider.getBalance(address);
  const balanceEther = ethers.formatEther(balance);

  // Get native token price
  const priceMap: Record<string, string> = {
    ethereum: 'ethereum',
    base: 'ethereum',
    arbitrum: 'ethereum',
    polygon: 'matic-network',
    bsc: 'binancecoin',
  };

  let price = 0;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${priceMap[chainId]}&vs_currencies=usd`
    );
    const data = await res.json();
    price = data[priceMap[chainId]]?.usd || 0;
  } catch (e) {
    console.warn(`Price fetch failed for ${chainId}`);
  }

  return {
    balance: balanceEther,
    balanceUsd: parseFloat(balanceEther) * price,
  };
};

// Get ERC20 token balances using Covalent API
export const getEvmTokens = async (address: string, chainId: ChainId): Promise<Token[]> => {
  const covalentKey = import.meta.env.VITE_COVALENT_API_KEY;
  
  // Chain ID mapping for Covalent
  const covalentChainMap: Record<ChainId, string> = {
    ethereum: 'eth-mainnet',
    base: 'base-mainnet',
    arbitrum: 'arbitrum-mainnet',
    polygon: 'matic-mainnet',
    bsc: 'bsc-mainnet',
    solana: '', // Not used for Solana
  };

  if (!covalentKey) {
    console.warn('Covalent API key not configured, using fallback');
    return getFallbackTokens(address, chainId);
  }

  try {
    const response = await fetch(
      `https://api.covalenthq.com/v1/${covalentChainMap[chainId]}/address/${address}/balances_v2/`,
      {
        headers: {
          Authorization: `Bearer ${covalentKey}`,
        },
      }
    );

    const data = await response.json();
    const tokens: Token[] = [];

    for (const item of data.data?.items || []) {
      if (item.balance === '0' || item.type === 'dust') continue;

      const balance = parseFloat(ethers.formatUnits(item.balance, item.contract_decimals));
      const price = item.quote_rate || 0;

      if (balance > 0) {
        tokens.push({
          address: item.contract_address,
          symbol: item.contract_ticker_symbol || 'Unknown',
          name: item.contract_name || 'Unknown Token',
          decimals: item.contract_decimals,
          balance: balance.toString(),
          balanceUsd: item.quote || balance * price,
          price,
          priceChange24h: item.quote_rate_24h || 0,
          logoUrl: item.logo_url,
          chain: chainId,
        });
      }
    }

    return tokens.sort((a, b) => b.balanceUsd - a.balanceUsd);
  } catch (error) {
    console.error(`Token fetch error for ${chainId}:`, error);
    return getFallbackTokens(address, chainId);
  }
};

// Fallback token fetch using direct RPC calls for major tokens
const getFallbackTokens = async (address: string, chainId: ChainId): Promise<Token[]> => {
  const provider = getProvider(chainId);
  const tokens: Token[] = [];

  // Top tokens by chain
  const topTokens: Record<ChainId, Array<{ address: string; symbol: string; name: string }>> = {
    ethereum: [
      { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD' },
      { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin' },
      { address: '0x6B175474E89094C44Da98b954EescdeCB5B2FBBA6', symbol: 'DAI', name: 'Dai' },
      { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped Bitcoin' },
    ],
    base: [
      { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin' },
      { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether' },
    ],
    arbitrum: [
      { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin' },
      { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD' },
    ],
    polygon: [
      { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin' },
      { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD' },
    ],
    bsc: [
      { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD' },
      { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin' },
    ],
    solana: [],
  };

  for (const token of topTokens[chainId] || []) {
    try {
      const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const [balance, decimals] = await Promise.all([
        contract.balanceOf(address),
        contract.decimals(),
      ]);

      const balanceFormatted = parseFloat(ethers.formatUnits(balance, decimals));
      if (balanceFormatted > 0) {
        tokens.push({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals,
          balance: balanceFormatted.toString(),
          balanceUsd: balanceFormatted, // Assuming stablecoins = $1
          price: 1,
          priceChange24h: 0,
          chain: chainId,
        });
      }
    } catch (e) {
      // Token might not exist on this chain
    }
  }

  return tokens;
};

// Get NFTs using Alchemy NFT API
export const getEvmNFTs = async (address: string, chainId: ChainId): Promise<NFT[]> => {
  const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY;
  if (!alchemyKey) return [];

  const alchemyChainMap: Record<ChainId, string> = {
    ethereum: 'eth-mainnet',
    base: 'base-mainnet',
    arbitrum: 'arb-mainnet',
    polygon: 'polygon-mainnet',
    bsc: '', // Alchemy doesn't support BSC
    solana: '',
  };

  const network = alchemyChainMap[chainId];
  if (!network) return [];

  try {
    const response = await fetch(
      `https://${network}.g.alchemy.com/nft/v3/${alchemyKey}/getNFTsForOwner?owner=${address}&withMetadata=true`
    );

    const data = await response.json();
    const nfts: NFT[] = [];

    for (const nft of data.ownedNfts || []) {
      nfts.push({
        tokenId: nft.tokenId,
        contractAddress: nft.contract.address,
        name: nft.name || nft.title || 'Unknown NFT',
        description: nft.description,
        imageUrl: nft.image?.cachedUrl || nft.image?.originalUrl || '',
        collection: {
          name: nft.contract.name || 'Unknown Collection',
          floorPrice: nft.contract.openSeaMetadata?.floorPrice,
        },
        chain: chainId,
        attributes: nft.raw?.metadata?.attributes || [],
      });
    }

    return nfts;
  } catch (error) {
    console.error(`NFT fetch error for ${chainId}:`, error);
    return [];
  }
};

// Get transaction history
export const getEvmTransactions = async (
  address: string,
  chainId: ChainId,
  limit = 20
): Promise<Transaction[]> => {
  const covalentKey = import.meta.env.VITE_COVALENT_API_KEY;
  
  const covalentChainMap: Record<ChainId, string> = {
    ethereum: 'eth-mainnet',
    base: 'base-mainnet',
    arbitrum: 'arbitrum-mainnet',
    polygon: 'matic-mainnet',
    bsc: 'bsc-mainnet',
    solana: '',
  };

  if (!covalentKey) return [];

  try {
    const response = await fetch(
      `https://api.covalenthq.com/v1/${covalentChainMap[chainId]}/address/${address}/transactions_v3/page/0/?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${covalentKey}`,
        },
      }
    );

    const data = await response.json();
    const transactions: Transaction[] = [];

    for (const tx of data.data?.items || []) {
      const isSend = tx.from_address.toLowerCase() === address.toLowerCase();
      
      transactions.push({
        hash: tx.tx_hash,
        chain: chainId,
        timestamp: new Date(tx.block_signed_at).getTime(),
        from: tx.from_address,
        to: tx.to_address || '',
        value: ethers.formatEther(tx.value || '0'),
        valueUsd: tx.value_quote || 0,
        token: {
          symbol: CHAINS[chainId].symbol,
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
        },
        type: isSend ? 'send' : 'receive',
        status: tx.successful ? 'success' : 'failed',
        fee: ethers.formatEther(tx.gas_spent?.toString() || '0'),
        feeUsd: tx.gas_quote || 0,
      });
    }

    return transactions;
  } catch (error) {
    console.error(`Transaction fetch error for ${chainId}:`, error);
    return [];
  }
};

// Get DeFi positions using DeBank API
export const getEvmDefiPositions = async (
  address: string,
  chainId: ChainId
): Promise<DeFiPosition[]> => {
  // DeBank requires API key for production
  // For demo, return empty array
  return [];
};

// Get full EVM portfolio
export const getEvmPortfolio = async (
  address: string,
  chainId: ChainId
): Promise<WalletPortfolio> => {
  const [nativeBalance, tokens, nfts, transactions, defiPositions] = await Promise.all([
    getEvmNativeBalance(address, chainId),
    getEvmTokens(address, chainId),
    getEvmNFTs(address, chainId),
    getEvmTransactions(address, chainId),
    getEvmDefiPositions(address, chainId),
  ]);

  const tokensValueUsd = tokens.reduce((sum, t) => sum + t.balanceUsd, 0);
  const defiValueUsd = defiPositions.reduce((sum, p) => sum + p.totalValueUsd, 0);

  return {
    address,
    chain: chainId,
    nativeBalance: nativeBalance.balance,
    nativeBalanceUsd: nativeBalance.balanceUsd,
    tokens,
    nfts,
    transactions,
    defiPositions,
    totalValueUsd: nativeBalance.balanceUsd + tokensValueUsd + defiValueUsd,
  };
};

// Validate EVM address
export const isValidEvmAddress = (address: string): boolean => {
  return ethers.isAddress(address);
};

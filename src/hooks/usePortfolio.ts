import { useState, useCallback, useEffect } from 'react';
import { create } from 'zustand';
import { ChainId, CHAINS, WalletPortfolio, Token, Transaction, MultiChainPortfolio } from '../types';
import { getSolanaPortfolio, isValidSolanaAddress } from '../chains/solana';
import { getEvmPortfolio, isValidEvmAddress } from '../chains/evm';

// Zustand store for portfolio state
interface PortfolioStore {
  wallets: Map<string, WalletPortfolio[]>;
  totalValueUsd: number;
  valueByChain: Record<ChainId, number>;
  topTokens: Token[];
  recentTransactions: Transaction[];
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addWalletData: (address: string, portfolios: WalletPortfolio[]) => void;
  clearAll: () => void;
}

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  wallets: new Map(),
  totalValueUsd: 0,
  valueByChain: {
    solana: 0,
    ethereum: 0,
    base: 0,
    arbitrum: 0,
    polygon: 0,
    bsc: 0,
  },
  topTokens: [],
  recentTransactions: [],
  loading: false,
  error: null,

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addWalletData: (address, portfolios) => {
    const { wallets } = get();
    const newWallets = new Map(wallets);
    newWallets.set(address, portfolios);

    // Recalculate totals
    let totalValueUsd = 0;
    const valueByChain: Record<ChainId, number> = {
      solana: 0,
      ethereum: 0,
      base: 0,
      arbitrum: 0,
      polygon: 0,
      bsc: 0,
    };
    const allTokens: Token[] = [];
    const allTransactions: Transaction[] = [];

    newWallets.forEach((portfolioList) => {
      portfolioList.forEach((portfolio) => {
        totalValueUsd += portfolio.totalValueUsd;
        valueByChain[portfolio.chain] += portfolio.totalValueUsd;
        allTokens.push(...portfolio.tokens);
        allTransactions.push(...portfolio.transactions);
      });
    });

    // Get top 10 tokens by value
    const topTokens = allTokens
      .sort((a, b) => b.balanceUsd - a.balanceUsd)
      .slice(0, 10);

    // Get recent transactions
    const recentTransactions = allTransactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    set({
      wallets: newWallets,
      totalValueUsd,
      valueByChain,
      topTokens,
      recentTransactions,
    });
  },

  clearAll: () =>
    set({
      wallets: new Map(),
      totalValueUsd: 0,
      valueByChain: {
        solana: 0,
        ethereum: 0,
        base: 0,
        arbitrum: 0,
        polygon: 0,
        bsc: 0,
      },
      topTokens: [],
      recentTransactions: [],
    }),
}));

// Detect chain from address format
export const detectChain = (address: string): ChainId | 'evm' | null => {
  if (isValidSolanaAddress(address)) return 'solana';
  if (isValidEvmAddress(address)) return 'evm';
  return null;
};

// Main hook for fetching portfolio data
export const usePortfolio = () => {
  const store = usePortfolioStore();

  const fetchWalletPortfolio = useCallback(async (
    address: string,
    chains?: ChainId[]
  ): Promise<void> => {
    store.setLoading(true);
    store.setError(null);

    try {
      const addressType = detectChain(address);
      
      if (!addressType) {
        throw new Error('Invalid wallet address');
      }

      const portfolios: WalletPortfolio[] = [];

      if (addressType === 'solana') {
        const solanaPortfolio = await getSolanaPortfolio(address);
        portfolios.push(solanaPortfolio);
      } else if (addressType === 'evm') {
        // Fetch from all EVM chains or specified chains
        const evmChains = chains?.filter((c) => CHAINS[c].isEVM) || 
          (['ethereum', 'base', 'arbitrum', 'polygon', 'bsc'] as ChainId[]);

        const evmPromises = evmChains.map((chainId) =>
          getEvmPortfolio(address, chainId).catch((e) => {
            console.warn(`Failed to fetch ${chainId}:`, e);
            return null;
          })
        );

        const evmResults = await Promise.all(evmPromises);
        evmResults.forEach((result) => {
          if (result && result.totalValueUsd > 0) {
            portfolios.push(result);
          }
        });
      }

      store.addWalletData(address, portfolios);
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to fetch portfolio');
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const removeWallet = useCallback((address: string) => {
    const { wallets } = store;
    const newWallets = new Map(wallets);
    newWallets.delete(address);
    // Trigger recalculation by adding empty
    if (newWallets.size > 0) {
      const [firstAddr, firstData] = newWallets.entries().next().value;
      store.addWalletData(firstAddr, firstData);
    } else {
      store.clearAll();
    }
  }, [store]);

  return {
    ...store,
    fetchWalletPortfolio,
    removeWallet,
  };
};

// Hook for tracking a single chain
export const useChainPortfolio = (address: string, chainId: ChainId) => {
  const [portfolio, setPortfolio] = useState<WalletPortfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      let result: WalletPortfolio;

      if (chainId === 'solana') {
        if (!isValidSolanaAddress(address)) {
          throw new Error('Invalid Solana address');
        }
        result = await getSolanaPortfolio(address);
      } else {
        if (!isValidEvmAddress(address)) {
          throw new Error('Invalid EVM address');
        }
        result = await getEvmPortfolio(address, chainId);
      }

      setPortfolio(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { portfolio, loading, error, refresh: fetch };
};

// Hook for real-time price updates
export const usePrices = (tokens: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (tokens.length === 0) return;

    const fetchPrices = async () => {
      try {
        // Fetch from Jupiter for Solana tokens
        const solanaTokens = tokens.filter((t) => t.length === 44);
        if (solanaTokens.length > 0) {
          const res = await fetch(
            `https://price.jup.ag/v6/price?ids=${solanaTokens.join(',')}`
          );
          const data = await res.json();
          const jupiterPrices: Record<string, number> = {};
          Object.entries(data.data || {}).forEach(([key, value]: [string, any]) => {
            jupiterPrices[key] = value.price || 0;
          });
          setPrices((prev) => ({ ...prev, ...jupiterPrices }));
        }

        // Fetch from CoinGecko for EVM tokens
        const evmTokens = tokens.filter((t) => t.startsWith('0x'));
        if (evmTokens.length > 0) {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${evmTokens.join(',')}&vs_currencies=usd`
          );
          const data = await res.json();
          const cgPrices: Record<string, number> = {};
          Object.entries(data).forEach(([address, value]: [string, any]) => {
            cgPrices[address] = value.usd || 0;
          });
          setPrices((prev) => ({ ...prev, ...cgPrices }));
        }
      } catch (e) {
        console.warn('Price fetch failed:', e);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [tokens.join(',')]);

  return prices;
};

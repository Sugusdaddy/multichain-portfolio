import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface SolanaToken {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  usdValue: number;
  priceUsd: number;
  logo?: string;
}

export interface SolanaPortfolio {
  address: string;
  solBalance: number;
  solUsdValue: number;
  tokens: SolanaToken[];
  nfts: number;
  totalUsdValue: number;
  defiPositions: DefiPosition[];
}

export interface DefiPosition {
  protocol: string;
  type: 'lending' | 'staking' | 'lp' | 'vault';
  value: number;
  apy?: number;
  tokens: string[];
}

export class SolanaChain {
  private connection: Connection;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl);
  }

  async getPortfolio(address: string): Promise<SolanaPortfolio> {
    const pubkey = new PublicKey(address);

    const [solBalance, tokenAccounts, solPrice] = await Promise.all([
      this.connection.getBalance(pubkey),
      this.getTokenAccounts(pubkey),
      this.getSolPrice(),
    ]);

    const solBalanceNum = solBalance / LAMPORTS_PER_SOL;
    const solUsdValue = solBalanceNum * solPrice;

    // Get token prices and calculate values
    const tokens = await this.enrichTokens(tokenAccounts);
    const tokenValue = tokens.reduce((sum, t) => sum + t.usdValue, 0);

    // Get DeFi positions
    const defiPositions = await this.getDefiPositions(pubkey);
    const defiValue = defiPositions.reduce((sum, p) => sum + p.value, 0);

    return {
      address,
      solBalance: solBalanceNum,
      solUsdValue,
      tokens,
      nfts: 0, // Would need separate NFT fetch
      totalUsdValue: solUsdValue + tokenValue + defiValue,
      defiPositions,
    };
  }

  private async getTokenAccounts(owner: PublicKey): Promise<any[]> {
    const response = await this.connection.getParsedTokenAccountsByOwner(owner, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    return response.value
      .map(({ account }) => {
        const data = account.data.parsed.info;
        return {
          mint: data.mint,
          balance: data.tokenAmount.uiAmount,
          decimals: data.tokenAmount.decimals,
        };
      })
      .filter(t => t.balance > 0);
  }

  private async enrichTokens(tokens: any[]): Promise<SolanaToken[]> {
    if (tokens.length === 0) return [];

    // Batch price fetch from Jupiter
    const mints = tokens.map(t => t.mint);
    const prices = await this.getTokenPrices(mints);

    return tokens.map(t => ({
      mint: t.mint,
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      balance: t.balance,
      decimals: t.decimals,
      priceUsd: prices[t.mint] || 0,
      usdValue: t.balance * (prices[t.mint] || 0),
    }));
  }

  private async getTokenPrices(mints: string[]): Promise<Record<string, number>> {
    try {
      const response = await fetch(
        `https://price.jup.ag/v6/price?ids=${mints.join(',')}`
      );
      const data = await response.json();
      
      const prices: Record<string, number> = {};
      for (const [mint, info] of Object.entries(data.data || {})) {
        prices[mint] = (info as any).price || 0;
      }
      return prices;
    } catch {
      return {};
    }
  }

  private async getSolPrice(): Promise<number> {
    const cached = this.priceCache.get('SOL');
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.price;
    }

    try {
      const response = await fetch(
        'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112'
      );
      const data = await response.json();
      const price = data.data?.['So11111111111111111111111111111111111111112']?.price || 0;
      
      this.priceCache.set('SOL', { price, timestamp: Date.now() });
      return price;
    } catch {
      return 0;
    }
  }

  private async getDefiPositions(owner: PublicKey): Promise<DefiPosition[]> {
    const positions: DefiPosition[] = [];

    // Check common DeFi protocols
    // Marinade staking
    // Raydium LP
    // Orca LP
    // Solend lending
    // etc.

    return positions;
  }
}

export default SolanaChain;

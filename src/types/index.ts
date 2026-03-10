// Chain type definitions for multi-chain support

export type ChainId = 'solana' | 'ethereum' | 'base' | 'arbitrum' | 'polygon' | 'bsc';

export interface ChainConfig {
  id: ChainId;
  name: string;
  symbol: string;
  decimals: number;
  rpcUrl: string;
  explorerUrl: string;
  logoUrl: string;
  color: string;
  isEVM: boolean;
  chainIdHex?: string; // For EVM chains
}

export const CHAINS: Record<ChainId, ChainConfig> = {
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    color: '#14F195',
    isEVM: false,
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    color: '#627EEA',
    isEVM: true,
    chainIdHex: '0x1',
  },
  base: {
    id: 'base',
    name: 'Base',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    logoUrl: 'https://raw.githubusercontent.com/base-org/brand-kit/main/logo/symbol/Base_Symbol_Blue.png',
    color: '#0052FF',
    isEVM: true,
    chainIdHex: '0x2105',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ETH',
    decimals: 18,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    color: '#28A0F0',
    isEVM: true,
    chainIdHex: '0xa4b1',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    color: '#8247E5',
    isEVM: true,
    chainIdHex: '0x89',
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Chain',
    symbol: 'BNB',
    decimals: 18,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
    color: '#F0B90B',
    isEVM: true,
    chainIdHex: '0x38',
  },
};

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceUsd: number;
  price: number;
  priceChange24h: number;
  logoUrl?: string;
  chain: ChainId;
}

export interface NFT {
  tokenId: string;
  contractAddress: string;
  name: string;
  description?: string;
  imageUrl: string;
  collection: {
    name: string;
    floorPrice?: number;
  };
  chain: ChainId;
  attributes: Array<{ trait_type: string; value: string }>;
}

export interface Transaction {
  hash: string;
  chain: ChainId;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  valueUsd: number;
  token: {
    symbol: string;
    address: string;
    decimals: number;
  };
  type: 'send' | 'receive' | 'swap' | 'approve' | 'mint' | 'burn' | 'contract';
  status: 'success' | 'pending' | 'failed';
  fee: string;
  feeUsd: number;
}

export interface DeFiPosition {
  protocol: string;
  protocolLogo: string;
  chain: ChainId;
  type: 'lending' | 'borrowing' | 'staking' | 'liquidity' | 'farming';
  tokens: Array<{
    symbol: string;
    balance: string;
    valueUsd: number;
  }>;
  totalValueUsd: number;
  apy?: number;
  healthFactor?: number;
}

export interface WalletPortfolio {
  address: string;
  chain: ChainId;
  nativeBalance: string;
  nativeBalanceUsd: number;
  tokens: Token[];
  nfts: NFT[];
  transactions: Transaction[];
  defiPositions: DeFiPosition[];
  totalValueUsd: number;
}

export interface MultiChainPortfolio {
  wallets: Map<string, WalletPortfolio[]>;
  totalValueUsd: number;
  valueByChain: Record<ChainId, number>;
  topTokens: Token[];
  recentTransactions: Transaction[];
  loading: boolean;
  error: string | null;
}

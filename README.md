# 🌐 Multichain Portfolio Tracker

Real-time portfolio tracking across **Solana**, **Ethereum**, **Base**, **Arbitrum**, **Polygon**, and **BSC**. One dashboard for all your crypto.

![Multi-chain](https://img.shields.io/badge/Chains-6+-blue?style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Solana](https://img.shields.io/badge/Solana-black?style=flat&logo=solana&logoColor=14F195)
![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=flat&logo=ethereum&logoColor=white)

## ✨ Features

### Multi-Chain Support
| Chain | Tokens | NFTs | DeFi | Transactions |
|-------|--------|------|------|--------------|
| Solana | ✅ | ✅ | ✅ | ✅ |
| Ethereum | ✅ | ✅ | ✅ | ✅ |
| Base | ✅ | ✅ | ✅ | ✅ |
| Arbitrum | ✅ | ✅ | ✅ | ✅ |
| Polygon | ✅ | ✅ | ✅ | ✅ |
| BSC | ✅ | ✅ | ✅ | ✅ |

### Core Features
- **Unified Dashboard** - All chains in one view
- **Real-time Prices** - Live updates from multiple oracles
- **DeFi Positions** - Track LP, staking, lending across protocols
- **NFT Gallery** - Cross-chain NFT viewer with floor prices
- **Transaction History** - Unified tx feed with advanced filters
- **Portfolio Analytics** - PnL tracking, allocation charts, performance metrics
- **Whale Alerts** - Track large movements across chains
- **Gas Tracker** - Real-time gas prices for all networks

## 🚀 Quick Start

```bash
git clone https://github.com/Sugusdaddy/multichain-portfolio.git
cd multichain-portfolio
npm install
npm run dev
```

## 🔧 Configuration

```env
# Solana
VITE_SOLANA_RPC=https://api.mainnet-beta.solana.com
VITE_HELIUS_API_KEY=your_key

# EVM
VITE_ALCHEMY_API_KEY=your_key
VITE_INFURA_API_KEY=your_key

# APIs
VITE_COINGECKO_API_KEY=your_key
VITE_COVALENT_API_KEY=your_key
```

## 🏗️ Architecture

```
src/
├── chains/              # Chain-specific implementations
│   ├── solana/          # Solana RPC, SPL tokens, Metaplex
│   ├── ethereum/        # ethers.js, ERC20, ERC721
│   ├── base/            # Base L2 specifics
│   ├── arbitrum/        # Arbitrum One
│   └── common/          # Shared interfaces
├── api/                 # External API integrations
│   ├── coingecko.ts     # Price feeds
│   ├── covalent.ts      # Multi-chain data
│   ├── debank.ts        # DeFi positions
│   └── reservoir.ts     # NFT data
├── hooks/               # React hooks
│   ├── usePortfolio.ts  # Main portfolio hook
│   ├── useChain.ts      # Chain-specific data
│   └── usePrices.ts     # Price aggregation
├── components/          # UI components
└── types/               # TypeScript interfaces
```

## 📊 Supported Protocols

### Solana
- Jupiter, Raydium, Orca, Marinade, Drift, Mango, Kamino

### Ethereum
- Uniswap, Aave, Compound, Lido, Curve, Convex

### Base
- Aerodrome, BaseSwap, Moonwell

### Arbitrum
- GMX, Camelot, Radiant, Pendle

## 🔗 API Integrations

| Service | Purpose |
|---------|---------|
| Helius | Solana enhanced APIs |
| Alchemy | EVM node + NFT API |
| CoinGecko | Price feeds |
| Covalent | Multi-chain data |
| DeBank | DeFi positions |
| Reservoir | NFT floor prices |
| DeFiLlama | TVL & yield data |

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Solana**: @solana/web3.js, @solana/spl-token
- **EVM**: ethers.js v6, viem
- **Charts**: Recharts + D3
- **State**: Zustand + React Query

## 📈 Roadmap

- [x] Multi-chain token tracking
- [x] Unified transaction history
- [x] NFT gallery
- [x] Portfolio analytics
- [ ] DeFi position tracking
- [ ] Mobile app (React Native)
- [ ] Telegram bot integration
- [ ] Export to tax software

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ☕ by [@Sugusdaddy](https://github.com/Sugusdaddy)

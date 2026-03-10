import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolio, detectChain } from './hooks/usePortfolio';
import { CHAINS, ChainId } from './types';
import {
  Search,
  Wallet,
  Plus,
  X,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  Copy,
  PieChart,
  Image,
  History,
  BarChart3,
  Layers,
} from 'lucide-react';

const App: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'nfts' | 'transactions' | 'defi'>('overview');
  
  const {
    wallets,
    totalValueUsd,
    valueByChain,
    topTokens,
    recentTransactions,
    loading,
    error,
    fetchWalletPortfolio,
    removeWallet,
  } = usePortfolio();

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    
    const chainType = detectChain(searchInput);
    if (!chainType) {
      alert('Invalid wallet address');
      return;
    }
    
    await fetchWalletPortfolio(searchInput);
    setSearchInput('');
  };

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: value > 1000 ? 0 : 2,
    }).format(value);

  const formatNumber = (value: number, decimals = 4) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value);

  const formatAddress = (address: string, chars = 4) =>
    `${address.slice(0, chars)}...${address.slice(-chars)}`;

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Aggregate all data
  const allTokens = Array.from(wallets.values()).flatMap((portfolios) =>
    portfolios.flatMap((p) => p.tokens)
  );
  
  const allNfts = Array.from(wallets.values()).flatMap((portfolios) =>
    portfolios.flatMap((p) => p.nfts)
  );

  const allTransactions = Array.from(wallets.values())
    .flatMap((portfolios) => portfolios.flatMap((p) => p.transactions))
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Gradient Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-cyan-900/20 pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl bg-black/40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Multichain Portfolio</h1>
                <p className="text-xs text-gray-500">Track all your crypto in one place</p>
              </div>
            </div>

            {/* Add Wallet Form */}
            <form onSubmit={handleAddWallet} className="flex-1 max-w-lg mx-8">
              <div className="relative flex">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Add wallet address (Solana or EVM)..."
                  className="flex-1 pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-l-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-r-xl text-white font-medium hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 transition-all"
                >
                  {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>
            </form>

            {/* Chain Indicators */}
            <div className="flex items-center space-x-2">
              {(Object.keys(CHAINS) as ChainId[]).map((chainId) => (
                <div
                  key={chainId}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${CHAINS[chainId].color}20` }}
                  title={CHAINS[chainId].name}
                >
                  <span style={{ color: CHAINS[chainId].color }} className="text-xs font-bold">
                    {CHAINS[chainId].symbol.charAt(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {wallets.size === 0 ? (
          /* Empty State */
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-purple-500/20 to-cyan-400/20 flex items-center justify-center mb-6">
              <Wallet className="w-12 h-12 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Track Your Multi-Chain Portfolio</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Add any Solana or EVM wallet address to view balances, tokens, NFTs, and transaction history across all chains.
            </p>
            
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-2xl mx-auto">
              {(Object.keys(CHAINS) as ChainId[]).map((chainId) => (
                <motion.div
                  key={chainId}
                  whileHover={{ scale: 1.05 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div
                    className="w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${CHAINS[chainId].color}30` }}
                  >
                    <span style={{ color: CHAINS[chainId].color }} className="font-bold">
                      {CHAINS[chainId].symbol.charAt(0)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{CHAINS[chainId].name}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* Dashboard */
          <div className="space-y-6">
            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Portfolio Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-gray-400 mb-1">Total Portfolio Value</p>
                  <p className="text-4xl font-bold text-white">{formatUsd(totalValueUsd)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {Array.from(wallets.keys()).map((address) => (
                    <div
                      key={address}
                      className="flex items-center space-x-2 px-3 py-2 bg-white/5 rounded-lg"
                    >
                      <span className="text-gray-400 text-sm font-mono">{formatAddress(address)}</span>
                      <button
                        onClick={() => copyToClipboard(address)}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        <Copy className="w-3 h-3 text-gray-500" />
                      </button>
                      <button
                        onClick={() => removeWallet(address)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chain Breakdown */}
              <div className="grid grid-cols-6 gap-4">
                {(Object.keys(CHAINS) as ChainId[]).map((chainId) => (
                  <div
                    key={chainId}
                    className="p-4 rounded-xl bg-white/5"
                    style={{ borderLeft: `3px solid ${CHAINS[chainId].color}` }}
                  >
                    <p className="text-gray-400 text-sm mb-1">{CHAINS[chainId].name}</p>
                    <p className="text-white font-semibold">{formatUsd(valueByChain[chainId])}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex space-x-2">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'tokens', label: 'Tokens', icon: PieChart },
                { id: 'nfts', label: 'NFTs', icon: Image },
                { id: 'transactions', label: 'Activity', icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden"
              >
                {activeTab === 'overview' && (
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Holdings</h3>
                    <div className="space-y-3">
                      {topTokens.slice(0, 5).map((token, i) => (
                        <div
                          key={`${token.chain}-${token.address}`}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-500 w-6">{i + 1}</span>
                            {token.logoUrl ? (
                              <img src={token.logoUrl} alt={token.symbol} className="w-10 h-10 rounded-full" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white font-bold">
                                {token.symbol.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="text-white font-medium">{token.symbol}</p>
                              <p className="text-gray-500 text-sm">{token.name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">{formatNumber(parseFloat(token.balance))}</p>
                            <p className="text-gray-400 text-sm">{formatUsd(token.balanceUsd)}</p>
                          </div>
                          <div
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: `${CHAINS[token.chain].color}20`, color: CHAINS[token.chain].color }}
                          >
                            {CHAINS[token.chain].name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'tokens' && (
                  <div className="divide-y divide-white/5">
                    {loading ? (
                      <div className="p-8 text-center text-gray-400">Loading tokens...</div>
                    ) : allTokens.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">No tokens found</div>
                    ) : (
                      allTokens.sort((a, b) => b.balanceUsd - a.balanceUsd).map((token) => (
                        <div
                          key={`${token.chain}-${token.address}`}
                          className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            {token.logoUrl ? (
                              <img src={token.logoUrl} alt={token.symbol} className="w-10 h-10 rounded-full" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-white font-bold">
                                {token.symbol.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="text-white font-medium">{token.symbol}</p>
                              <p className="text-gray-500 text-sm">{token.name}</p>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="text-white">{formatUsd(token.price)}</p>
                            <p className={`text-sm ${token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">{formatNumber(parseFloat(token.balance))}</p>
                            <p className="text-gray-400 text-sm">{formatUsd(token.balanceUsd)}</p>
                          </div>
                          <div
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: `${CHAINS[token.chain].color}20`, color: CHAINS[token.chain].color }}
                          >
                            {CHAINS[token.chain].name}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'nfts' && (
                  <div className="p-4">
                    {loading ? (
                      <div className="p-8 text-center text-gray-400">Loading NFTs...</div>
                    ) : allNfts.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">No NFTs found</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {allNfts.map((nft) => (
                          <motion.div
                            key={`${nft.chain}-${nft.contractAddress}-${nft.tokenId}`}
                            whileHover={{ scale: 1.02 }}
                            className="rounded-xl overflow-hidden bg-white/5 cursor-pointer"
                          >
                            <div className="aspect-square relative">
                              <img
                                src={nft.imageUrl}
                                alt={nft.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200?text=NFT';
                                }}
                              />
                              <div
                                className="absolute top-2 right-2 px-2 py-1 rounded text-xs"
                                style={{ backgroundColor: CHAINS[nft.chain].color, color: 'white' }}
                              >
                                {CHAINS[nft.chain].name}
                              </div>
                            </div>
                            <div className="p-3">
                              <p className="text-white text-sm font-medium truncate">{nft.name}</p>
                              <p className="text-gray-500 text-xs truncate">{nft.collection.name}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'transactions' && (
                  <div className="divide-y divide-white/5">
                    {loading ? (
                      <div className="p-8 text-center text-gray-400">Loading transactions...</div>
                    ) : allTransactions.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">No transactions found</div>
                    ) : (
                      allTransactions.slice(0, 50).map((tx) => (
                        <div
                          key={`${tx.chain}-${tx.hash}`}
                          className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                tx.type === 'receive'
                                  ? 'bg-green-500/20 text-green-400'
                                  : tx.type === 'send'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-purple-500/20 text-purple-400'
                              }`}
                            >
                              {tx.type === 'receive' ? (
                                <ArrowDownLeft className="w-5 h-5" />
                              ) : tx.type === 'send' ? (
                                <ArrowUpRight className="w-5 h-5" />
                              ) : (
                                <RefreshCw className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">{tx.type}</p>
                              <p className="text-gray-500 text-sm">{formatDate(tx.timestamp)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-medium ${
                                tx.type === 'receive' ? 'text-green-400' : 'text-white'
                              }`}
                            >
                              {tx.type === 'receive' ? '+' : '-'}
                              {formatNumber(parseFloat(tx.value))} {tx.token.symbol}
                            </p>
                            <a
                              href={`${CHAINS[tx.chain].explorerUrl}/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-500 text-sm hover:text-purple-400 flex items-center justify-end"
                            >
                              {formatAddress(tx.hash)}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                          <div
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: `${CHAINS[tx.chain].color}20`, color: CHAINS[tx.chain].color }}
                          >
                            {CHAINS[tx.chain].name}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500">
            Built with ☕ by{' '}
            <a
              href="https://github.com/Sugusdaddy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              @Sugusdaddy
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

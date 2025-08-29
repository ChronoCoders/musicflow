export const ROYALTY_DISTRIBUTOR_ADDRESS = "0xE8F3d2b0711Dd97EDD17795450a5961c1676E581";

export const ROYALTY_DISTRIBUTOR_ABI = [
  {
    "inputs": [
      {"name": "trackId", "type": "bytes32"},
      {"name": "rightHolders", "type": "address[]"},
      {"name": "percentages", "type": "uint256[]"}
    ],
    "name": "registerTrack",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "trackId", "type": "bytes32"}],
    "name": "addRevenue",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "trackId", "type": "bytes32"}],
    "name": "getTrackRightHolders",
    "outputs": [
      {"name": "holders", "type": "address[]"},
      {"name": "percentages", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "address"}],
    "name": "pendingWithdrawals",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
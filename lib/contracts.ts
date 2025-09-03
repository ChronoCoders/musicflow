export const ROYALTY_DISTRIBUTOR_ADDRESS = "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B" as const

export const ROYALTY_DISTRIBUTOR_ABI = [
  {
    inputs: [
      { name: "trackId", type: "bytes32" },
      { name: "rightHolders", type: "address[]" },
      { name: "percentages", type: "uint256[]" },
    ],
    name: "registerTrack",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "trackId", type: "bytes32" }],
    name: "addRevenue",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "trackId", type: "bytes32" }],
    name: "getTrackRightHolders",
    outputs: [
      { name: "holders", type: "address[]" },
      { name: "percentages", type: "uint256[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "trackId", type: "bytes32" }],
    name: "getTrackEarnings",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "pendingWithdrawals",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "bytes32" }],
    name: "tracks",
    outputs: [
      { name: "creator", type: "address" },
      { name: "totalEarnings", type: "uint256" },
      { name: "exists", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "trackId", type: "bytes32" },
      { indexed: true, name: "creator", type: "address" },
    ],
    name: "TrackRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "trackId", type: "bytes32" },
      { indexed: true, name: "holder", type: "address" },
      { indexed: false, name: "percentage", type: "uint256" },
    ],
    name: "RightHolderAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "trackId", type: "bytes32" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "RevenueAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Withdrawal",
    type: "event",
  },
] as const

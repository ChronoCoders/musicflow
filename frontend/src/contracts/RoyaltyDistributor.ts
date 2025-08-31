export const ROYALTY_DISTRIBUTOR_ADDRESS = "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B"

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
    inputs: [{ name: "", type: "address" }],
    name: "pendingWithdrawals",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

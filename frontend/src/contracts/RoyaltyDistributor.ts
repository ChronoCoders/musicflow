export const ROYALTY_DISTRIBUTOR_ADDRESS = "0x00Ff9ddD446C8b00b6E645E2b8e23d01641952AD";

export const ROYALTY_DISTRIBUTOR_ABI = [
  "function registerTrack(bytes32 trackId) external",
  "function addRevenue(bytes32 trackId) external payable",
  "function withdraw() external",
  "function getTrackEarnings(bytes32 trackId) external view returns (uint256)",
  "function tracks(bytes32) external view returns (address owner, uint256 totalEarnings, bool exists)",
  "function pendingWithdrawals(address) external view returns (uint256)",
  "event TrackRegistered(bytes32 indexed trackId, address indexed owner)",
  "event RevenueAdded(bytes32 indexed trackId, uint256 amount)",
  "event Withdrawal(address indexed user, uint256 amount)"
];
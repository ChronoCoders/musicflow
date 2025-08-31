// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RoyaltyDistributor {
    struct RightHolder {
        address holder;
        uint256 percentage; // percentage * 100 (e.g., 2500 = 25%)
    }
    
    struct Track {
        address creator;
        RightHolder[] rightHolders;
        uint256 totalEarnings;
        bool exists;
    }
    
    mapping(bytes32 => Track) public tracks;
    mapping(address => uint256) public pendingWithdrawals;
    
    event TrackRegistered(bytes32 indexed trackId, address indexed creator);
    event RightHolderAdded(bytes32 indexed trackId, address indexed holder, uint256 percentage);
    event RevenueAdded(bytes32 indexed trackId, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    modifier onlyTrackCreator(bytes32 trackId) {
        require(tracks[trackId].creator == msg.sender, "Only track creator can modify");
        _;
    }
    
    function registerTrack(
        bytes32 trackId,
        address[] memory rightHolders,
        uint256[] memory percentages
    ) external {
        require(!tracks[trackId].exists, "Track already exists");
        require(rightHolders.length == percentages.length, "Arrays length mismatch");
        
        // Validate percentages sum to 10000 (100.00%)
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < percentages.length; i++) {
            totalPercentage += percentages[i];
        }
        require(totalPercentage == 10000, "Percentages must sum to 100%");
        
        tracks[trackId].creator = msg.sender;
        tracks[trackId].exists = true;
        
        // Add right holders
        for (uint256 i = 0; i < rightHolders.length; i++) {
            tracks[trackId].rightHolders.push(RightHolder({
                holder: rightHolders[i],
                percentage: percentages[i]
            }));
            
            emit RightHolderAdded(trackId, rightHolders[i], percentages[i]);
        }
        
        emit TrackRegistered(trackId, msg.sender);
    }
    
    function addRevenue(bytes32 trackId) external payable {
        require(tracks[trackId].exists, "Track does not exist");
        require(msg.value > 0, "Amount must be greater than 0");
        
        tracks[trackId].totalEarnings += msg.value;
        
        // Distribute revenue to all right holders
        RightHolder[] storage rightHolders = tracks[trackId].rightHolders;
        for (uint256 i = 0; i < rightHolders.length; i++) {
            uint256 amount = (msg.value * rightHolders[i].percentage) / 10000;
            pendingWithdrawals[rightHolders[i].holder] += amount;
        }
        
        emit RevenueAdded(trackId, msg.value);
    }
    
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit Withdrawal(msg.sender, amount);
    }
    
    function getTrackRightHolders(bytes32 trackId) 
        external 
        view 
        returns (address[] memory holders, uint256[] memory percentages) 
    {
        RightHolder[] storage rightHolders = tracks[trackId].rightHolders;
        holders = new address[](rightHolders.length);
        percentages = new uint256[](rightHolders.length);
        
        for (uint256 i = 0; i < rightHolders.length; i++) {
            holders[i] = rightHolders[i].holder;
            percentages[i] = rightHolders[i].percentage;
        }
    }
    
    function getTrackEarnings(bytes32 trackId) external view returns (uint256) {
        return tracks[trackId].totalEarnings;
    }
}

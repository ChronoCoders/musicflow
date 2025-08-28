// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract RoyaltyDistributor {
    struct Track {
        address owner;
        uint256 totalEarnings;
        bool exists;
    }
    
    mapping(bytes32 => Track) public tracks;
    mapping(address => uint256) public pendingWithdrawals;
    
    event TrackRegistered(bytes32 indexed trackId, address indexed owner);
    event RevenueAdded(bytes32 indexed trackId, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    function registerTrack(bytes32 trackId) external {
        require(!tracks[trackId].exists, "Track already exists");
        
        tracks[trackId] = Track({
            owner: msg.sender,
            totalEarnings: 0,
            exists: true
        });
        
        emit TrackRegistered(trackId, msg.sender);
    }
    
    function addRevenue(bytes32 trackId) external payable {
        require(tracks[trackId].exists, "Track does not exist");
        require(msg.value > 0, "Amount must be greater than 0");
        
        tracks[trackId].totalEarnings += msg.value;
        pendingWithdrawals[tracks[trackId].owner] += msg.value;
        
        emit RevenueAdded(trackId, msg.value);
    }
    
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        
        emit Withdrawal(msg.sender, amount);
    }
    
    function getTrackEarnings(bytes32 trackId) external view returns (uint256) {
        return tracks[trackId].totalEarnings;
    }
}
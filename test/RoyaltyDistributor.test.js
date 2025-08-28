const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RoyaltyDistributor", function () {
  let royaltyDistributor;
  let owner, addr1, addr2;
  
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const RoyaltyDistributor = await ethers.getContractFactory("RoyaltyDistributor");
    royaltyDistributor = await RoyaltyDistributor.deploy();
  });
  
  it("Should register a track", async function () {
    const trackId = ethers.keccak256(ethers.toUtf8Bytes("track1"));
    
    await royaltyDistributor.registerTrack(trackId);
    
    const track = await royaltyDistributor.tracks(trackId);
    expect(track.owner).to.equal(owner.address);
    expect(track.exists).to.be.true;
  });
  
  it("Should add revenue and allow withdrawal", async function () {
    const trackId = ethers.keccak256(ethers.toUtf8Bytes("track2"));
    const revenueAmount = ethers.parseEther("1.0");
    
    await royaltyDistributor.registerTrack(trackId);
    await royaltyDistributor.addRevenue(trackId, { value: revenueAmount });
    
    const pendingBefore = await royaltyDistributor.pendingWithdrawals(owner.address);
    expect(pendingBefore).to.equal(revenueAmount);
    
    await royaltyDistributor.withdraw();
    
    const pendingAfter = await royaltyDistributor.pendingWithdrawals(owner.address);
    expect(pendingAfter).to.equal(0);
  });
});
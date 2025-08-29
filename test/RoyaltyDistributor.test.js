const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('RoyaltyDistributor - Multi-Owner', function () {
  let royaltyDistributor
  let owner, addr1, addr2, addr3

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners()

    const RoyaltyDistributor =
      await ethers.getContractFactory('RoyaltyDistributor')
    royaltyDistributor = await RoyaltyDistributor.deploy()
  })

  it('Should register a track with multiple owners', async function () {
    const trackId = ethers.keccak256(ethers.toUtf8Bytes('multi-track'))
    const holders = [owner.address, addr1.address, addr2.address]
    const percentages = [5000, 3000, 2000] // 50%, 30%, 20%

    await royaltyDistributor.registerTrack(trackId, holders, percentages)

    const track = await royaltyDistributor.tracks(trackId)
    expect(track.creator).to.equal(owner.address)
    expect(track.exists).to.be.true
  })

  it('Should distribute revenue to multiple owners correctly', async function () {
    const trackId = ethers.keccak256(ethers.toUtf8Bytes('revenue-track'))
    const holders = [owner.address, addr1.address]
    const percentages = [7000, 3000] // 70%, 30%
    const revenueAmount = ethers.parseEther('1.0')

    await royaltyDistributor.registerTrack(trackId, holders, percentages)
    await royaltyDistributor.addRevenue(trackId, { value: revenueAmount })

    const ownerPending = await royaltyDistributor.pendingWithdrawals(
      owner.address
    )
    const addr1Pending = await royaltyDistributor.pendingWithdrawals(
      addr1.address
    )

    expect(ownerPending).to.equal(ethers.parseEther('0.7')) // 70%
    expect(addr1Pending).to.equal(ethers.parseEther('0.3')) // 30%
  })

  it('Should reject invalid percentage totals', async function () {
    const trackId = ethers.keccak256(ethers.toUtf8Bytes('invalid-track'))
    const holders = [owner.address, addr1.address]
    const percentages = [5000, 6000] // 110% - should fail

    await expect(
      royaltyDistributor.registerTrack(trackId, holders, percentages)
    ).to.be.revertedWith('Percentages must sum to 100%')
  })
})

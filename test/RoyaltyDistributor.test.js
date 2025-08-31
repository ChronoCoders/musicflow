it("Should allow owners to withdraw their pending balance correctly", async function () {
  const trackId = ethers.keccak256(ethers.toUtf8Bytes("withdraw-track"));
  const holders = [owner.address, addr1.address];
  const percentages = [6000, 4000]; // 60%, 40%
  const revenueAmount = ethers.parseEther("1.0"); // 1 MATIC

  // Register track and add revenue
  await royaltyDistributor.registerTrack(trackId, holders, percentages);
  await royaltyDistributor.addRevenue(trackId, { value: revenueAmount });

  // Check initial pending balances
  const pendingOwner = await royaltyDistributor.pendingWithdrawals(owner.address);
  const pendingAddr1 = await royaltyDistributor.pendingWithdrawals(addr1.address);

  expect(pendingOwner).to.equal(ethers.parseEther("0.6"));
  expect(pendingAddr1).to.equal(ethers.parseEther("0.4"));

  // Track owner balances before withdrawal
  const balanceOwnerBefore = await ethers.provider.getBalance(owner.address);
  const balanceAddr1Before = await ethers.provider.getBalance(addr1.address);

  // Withdraw as owner
  const txOwner = await royaltyDistributor.connect(owner).withdraw();
  const receiptOwner = await txOwner.wait();
  const gasUsedOwner = receiptOwner.gasUsed * receiptOwner.effectiveGasPrice;

  const balanceOwnerAfter = await ethers.provider.getBalance(owner.address);
  expect(balanceOwnerAfter).to.equal(balanceOwnerBefore + ethers.parseEther("0.6") - gasUsedOwner);

  // Withdraw as addr1
  const txAddr1 = await royaltyDistributor.connect(addr1).withdraw();
  const receiptAddr1 = await txAddr1.wait();
  const gasUsedAddr1 = receiptAddr1.gasUsed * receiptAddr1.effectiveGasPrice;

  const balanceAddr1After = await ethers.provider.getBalance(addr1.address);
  expect(balanceAddr1After).to.equal(balanceAddr1Before + ethers.parseEther("0.4") - gasUsedAddr1);

  // Pending withdrawals should be zero
  expect(await royaltyDistributor.pendingWithdrawals(owner.address)).to.equal(0);
  expect(await royaltyDistributor.pendingWithdrawals(addr1.address)).to.equal(0);
});

const hre = require("hardhat");

async function main() {
  console.log("Deploying RoyaltyDistributor...");
  
  const RoyaltyDistributor = await hre.ethers.getContractFactory("RoyaltyDistributor");
  const royaltyDistributor = await RoyaltyDistributor.deploy();

  // Wait until deployment is mined
  await royaltyDistributor.deployed();
  
  console.log("RoyaltyDistributor deployed to:", royaltyDistributor.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const hre = require('hardhat')

async function main () {
  console.log('Deploying RoyaltyDistributor...')

  const RoyaltyDistributor =
    await hre.ethers.getContractFactory('RoyaltyDistributor')
  const royaltyDistributor = await RoyaltyDistributor.deploy()

  await royaltyDistributor.waitForDeployment()

  console.log(
    'RoyaltyDistributor deployed to:',
    await royaltyDistributor.getAddress()
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

const hre = require("hardhat");

// Base mainnet USDC address (Circle-issued native USDC).
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  const net = await hre.ethers.provider.getNetwork();
  if (net.chainId !== 8453n) {
    throw new Error(`Refusing to deploy: expected Base mainnet (8453), got chainId ${net.chainId}`);
  }

  console.log("Deploying BountixEscrowV0 to Base mainnet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Use deployer as the initial resolver; owner can change it later via updateResolver().
  const resolverAddress = deployer.address;

  console.log("Constructor parameters:");
  console.log("- USDC address:    ", BASE_MAINNET_USDC);
  console.log("- Initial resolver:", resolverAddress);
  console.log("");

  const BountixEscrowV0 = await hre.ethers.getContractFactory("BountixEscrowV0");

  // Estimate gas/cost and guard against insufficient balance before sending.
  console.log("Estimating deployment gas...");
  const deployTx = await BountixEscrowV0.getDeployTransaction(BASE_MAINNET_USDC, resolverAddress);
  const estimatedGas = await hre.ethers.provider.estimateGas(deployTx);
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
  const estimatedCost = estimatedGas * gasPrice;

  console.log("Estimated gas: ", estimatedGas.toString());
  console.log("Gas price:     ", hre.ethers.formatUnits(gasPrice, "gwei"), "gwei");
  console.log("Estimated cost:", hre.ethers.formatEther(estimatedCost), "ETH\n");

  if (balance < estimatedCost) {
    throw new Error(
      `Insufficient ETH: balance ${hre.ethers.formatEther(balance)} < estimated cost ${hre.ethers.formatEther(estimatedCost)}`
    );
  }

  console.log("Deploying contract...");
  const escrow = await BountixEscrowV0.deploy(BASE_MAINNET_USDC, resolverAddress);
  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();
  const deploymentTx = escrow.deploymentTransaction();

  console.log("\nDeployment submitted!");
  console.log("Contract address:", contractAddress);
  console.log("Transaction hash:", deploymentTx.hash);

  console.log("\nWaiting for 3 confirmations...");
  const receipt = await deploymentTx.wait(3);
  console.log("Confirmed in block:", receipt.blockNumber);

  const actualGasUsed = receipt.gasUsed;
  const effGasPrice = receipt.gasPrice ?? receipt.effectiveGasPrice;
  const actualCost = actualGasUsed * effGasPrice;

  console.log("\nDeployment stats:");
  console.log("- Gas used: ", actualGasUsed.toString());
  console.log("- Gas price:", hre.ethers.formatUnits(effGasPrice, "gwei"), "gwei");
  console.log("- Total cost:", hre.ethers.formatEther(actualCost), "ETH");

  console.log("\n=== SAVE THIS ===");
  console.log("Contract:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("Tx hash: ", deploymentTx.hash);
  console.log("Basescan:", `https://basescan.org/address/${contractAddress}`);
  console.log("=================\n");

  console.log("Next steps:");
  console.log("1. Record the address + tx hash in docs/escrow-contract.md");
  console.log("2. (Optional) Verify: npx hardhat verify --network base", contractAddress, BASE_MAINNET_USDC, resolverAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

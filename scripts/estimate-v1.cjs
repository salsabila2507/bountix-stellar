const hre = require("hardhat");

// Base mainnet USDC address (Circle-issued native USDC).
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

function requireAddress(name) {
  const value = process.env[name];
  if (!value || !hre.ethers.isAddress(value) || value === hre.ethers.ZeroAddress) {
    throw new Error(`Set ${name} to a non-zero address before estimating V1.`);
  }
  return value;
}

function optionalAddress(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  if (!hre.ethers.isAddress(value) || value === hre.ethers.ZeroAddress) {
    throw new Error(`${name} must be a non-zero address when set.`);
  }
  return value;
}

// Read-only pre-deploy check. Does not send any transaction or deploy anything.
async function main() {
  const net = await hre.ethers.provider.getNetwork();
  console.log("Network chainId:", net.chainId.toString(), net.chainId === 8453n ? "(Base mainnet)" : "(NOT Base mainnet!)");

  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signer configured. Set PRIVATE_KEY in .env before estimating.");
  }
  const [deployer] = signers;

  const resolverAddress = optionalAddress("V1_RESOLVER_ADDRESS", deployer.address);
  const treasuryAddress = requireAddress("V1_TREASURY_ADDRESS");

  console.log("Deployer address:", deployer.address);
  console.log("Initial resolver:", resolverAddress);
  console.log("Treasury:        ", treasuryAddress);
  console.log("Default fee bps: 250");
  console.log("Max fee bps:     1000");

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

  const BountixEscrowV1 = await hre.ethers.getContractFactory("BountixEscrowV1");
  const deployTx = await BountixEscrowV1.getDeployTransaction(
    BASE_MAINNET_USDC,
    resolverAddress,
    treasuryAddress,
  );

  const estimatedGas = await hre.ethers.provider.estimateGas(deployTx);
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
  if (!gasPrice) throw new Error("Unable to determine gas price.");
  const estimatedCost = estimatedGas * gasPrice;

  console.log("\nBountixEscrowV1 deployment estimate:");
  console.log("- Estimated gas: ", estimatedGas.toString());
  console.log("- Gas price:     ", hre.ethers.formatUnits(gasPrice, "gwei"), "gwei");
  console.log("- Estimated cost:", hre.ethers.formatEther(estimatedCost), "ETH");

  const margin = estimatedCost * 3n;
  console.log("- Suggested min balance (3x):", hre.ethers.formatEther(margin), "ETH");

  console.log("\nResult:", balance >= margin
    ? "OK - balance comfortably covers the estimated deploy cost."
    : balance >= estimatedCost
      ? "TIGHT - balance covers the estimate but has little headroom for gas spikes."
      : "INSUFFICIENT - balance is below the estimated deploy cost. Fund the wallet first.");
  console.log("\n(No transaction was sent. This is an estimate only.)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

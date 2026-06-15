/**
 * CertificateRegistry deployment script
 *
 * Deploys the contract to Ethereum Sepolia Testnet and prints the
 * contract address and transaction hash for recording in Chapter 4.
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in SEPOLIA_RPC_URL and
 *      DEPLOYER_PRIVATE_KEY (fund the wallet from https://sepoliafaucet.com)
 *   2. Run:
 *        npm run deploy:sepolia
 *      or:
 *        npx hardhat run scripts/deploy.js --network sepolia
 *
 * The deployer wallet receives SUPERADMIN_ROLE and DEFAULT_ADMIN_ROLE.
 * After deployment, use grantCertificateRole() to add Registry Admin wallets.
 */

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("  NAUB CertificateRegistry — Sepolia Deployment");
  console.log("=".repeat(60));
  console.log(`\nDeployer wallet : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error(
      "\nERROR: Deployer wallet has no Sepolia ETH.\n" +
        "Get test ETH from https://sepoliafaucet.com then try again."
    );
    process.exit(1);
  }

  console.log("\nDeploying CertificateRegistry...");

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy(deployer.address);

  console.log(`Transaction hash    : ${registry.deploymentTransaction().hash}`);
  console.log("Waiting for confirmation...");

  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();

  console.log("\n" + "=".repeat(60));
  console.log("  Deployment successful!");
  console.log("=".repeat(60));
  console.log(`Contract address    : ${contractAddress}`);
  console.log(`Transaction hash    : ${registry.deploymentTransaction().hash}`);
  console.log(
    `Etherscan           : https://sepolia.etherscan.io/address/${contractAddress}`
  );

  // Verify roles
  const SUPERADMIN_ROLE = await registry.SUPERADMIN_ROLE();
  const CERTIFICATE_ROLE = await registry.CERTIFICATE_ROLE();
  const isSuperAdmin = await registry.hasRole(SUPERADMIN_ROLE, deployer.address);
  const isCertAdmin = await registry.hasRole(CERTIFICATE_ROLE, deployer.address);

  console.log("\nRole verification:");
  console.log(`  SUPERADMIN_ROLE   : ${isSuperAdmin ? "GRANTED ✓" : "NOT granted ✗"}`);
  console.log(`  CERTIFICATE_ROLE  : ${isCertAdmin ? "GRANTED ✓" : "NOT granted ✗"}`);

  console.log("\n" + "=".repeat(60));
  console.log("  IMPORTANT — record these in your .env and Chapter 4:");
  console.log("=".repeat(60));
  console.log(`CERTIFICATE_REGISTRY_ADDRESS=${contractAddress}`);
  console.log(`DEPLOYER_ADDRESS=${deployer.address}`);
  console.log(
    "\nAdd CERTIFICATE_REGISTRY_ADDRESS to your Vercel environment variables."
  );
  console.log(
    "The Next.js app will automatically call the real contract instead of simulating.\n"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

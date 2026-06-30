/**
 * Gas cost measurement script.
 *
 * Deploys a fresh CertificateRegistry to the local Hardhat in-memory
 * network and measures the exact gas used by issueCertificate() and
 * revokeCertificate(), plus a few supporting operations, for inclusion
 * in Chapter 4's gas cost analysis.
 *
 * Run with: npx hardhat run scripts/measure-gas.js
 * (No network flag needed - runs on the local Hardhat network, which
 * has the same gas accounting as Sepolia since gas costs are a function
 * of EVM opcodes executed, not the network itself.)
 */

const { ethers } = require("hardhat");

async function main() {
  const [superAdmin, registryAdmin] = await ethers.getSigners();

  console.log("=".repeat(70));
  console.log("  Gas Cost Measurement - CertificateRegistry");
  console.log("=".repeat(70));

  const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy(superAdmin.address);
  await registry.waitForDeployment();

  const deployTx = registry.deploymentTransaction();
  const deployReceipt = await deployTx.wait();
  console.log(`\nDeployment gas used:        ${deployReceipt.gasUsed.toString()}`);

  // Grant CERTIFICATE_ROLE to a Registry Admin
  const grantTx = await registry.grantCertificateRole(registryAdmin.address);
  const grantReceipt = await grantTx.wait();
  console.log(`grantCertificateRole gas:    ${grantReceipt.gasUsed.toString()}`);

  // Measure issueCertificate gas cost
  const certHash = ethers.id("NAUB-CERT-GAS-TEST-0001");
  const holderHash = ethers.id("TEST STUDENT|2000-01-01");
  const ipfsCid = "ipfs://bafybeigastestcid0001";

  const issueTx = await registry
    .connect(registryAdmin)
    .issueCertificate(certHash, holderHash, ipfsCid);
  const issueReceipt = await issueTx.wait();
  console.log(`\nissueCertificate gas used:   ${issueReceipt.gasUsed.toString()}`);

  // Measure verifyCertificate gas cost (should be 0 - it's a view call)
  const verifyResult = await registry.verifyCertificate(certHash);
  console.log(`verifyCertificate gas used:   0 (free view call, confirmed exists=${verifyResult.exists})`);

  // Measure revokeCertificate gas cost
  const revokeTx = await registry
    .connect(registryAdmin)
    .revokeCertificate(certHash, "Gas measurement test - issued in error");
  const revokeReceipt = await revokeTx.wait();
  console.log(`revokeCertificate gas used:  ${revokeReceipt.gasUsed.toString()}`);

  // Measure pause/unpause gas cost
  const pauseTx = await registry.pause();
  const pauseReceipt = await pauseTx.wait();
  console.log(`\npause() gas used:            ${pauseReceipt.gasUsed.toString()}`);

  const unpauseTx = await registry.unpause();
  const unpauseReceipt = await unpauseTx.wait();
  console.log(`unpause() gas used:          ${unpauseReceipt.gasUsed.toString()}`);

  // Measure revokeCertificateRole gas cost
  const revokeRoleTx = await registry.revokeCertificateRole(registryAdmin.address);
  const revokeRoleReceipt = await revokeRoleTx.wait();
  console.log(`revokeCertificateRole gas:   ${revokeRoleReceipt.gasUsed.toString()}`);

  // Get current gas price for cost estimation
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;

  console.log("\n" + "=".repeat(70));
  console.log("  Summary Table (for Chapter 4)");
  console.log("=".repeat(70));
  console.log(`
| Operation                | Gas Used  |
|--------------------------|-----------|
| Contract Deployment      | ${deployReceipt.gasUsed.toString().padEnd(9)} |
| grantCertificateRole     | ${grantReceipt.gasUsed.toString().padEnd(9)} |
| issueCertificate         | ${issueReceipt.gasUsed.toString().padEnd(9)} |
| verifyCertificate (view) | 0 (free)  |
| revokeCertificate        | ${revokeReceipt.gasUsed.toString().padEnd(9)} |
| pause()                  | ${pauseReceipt.gasUsed.toString().padEnd(9)} |
| unpause()                | ${unpauseReceipt.gasUsed.toString().padEnd(9)} |
| revokeCertificateRole    | ${revokeRoleReceipt.gasUsed.toString().padEnd(9)} |
`);

  console.log("NOTE: To convert gas used to ETH/USD cost, multiply by the gas price");
  console.log("at the time of an actual Sepolia transaction. Check your real");
  console.log("transactions on Etherscan for the exact 'Transaction Fee' paid.");
  console.log("\nFor reference, this local network's current gas price estimate:");
  console.log(`Gas price: ${gasPrice.toString()} wei (${ethers.formatUnits(gasPrice, "gwei")} gwei)`);
  if (gasPrice > 0n) {
    const issueCostWei = issueReceipt.gasUsed * gasPrice;
    const revokeCostWei = revokeReceipt.gasUsed * gasPrice;
    console.log(`Estimated issueCertificate cost: ${ethers.formatEther(issueCostWei)} ETH`);
    console.log(`Estimated revokeCertificate cost: ${ethers.formatEther(revokeCostWei)} ETH`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

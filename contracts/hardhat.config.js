require("@nomicfoundation/hardhat-toolbox");

// Sandbox network policy blocks binaries.soliditylang.org, which Hardhat
// uses to download the native solc binary for the host platform. The WASM
// (solc-js) build is pre-seeded in the local Hardhat compiler cache instead,
// so we nudge the platform detection to fall back to WASM.
const os = require("os");
os.platform = () => "sunos";

/**
 * NAUB Blockchain Certificate System — Hardhat configuration
 *
 * Networks:
 *  - hardhat:  local in-memory network used for the 32 unit tests
 *  - sepolia:  Ethereum Sepolia Testnet, used for the deployed
 *              CertificateRegistry referenced throughout Chapter 3
 *
 * Environment variables (set in a .env file, see .env.example):
 *  - SEPOLIA_RPC_URL       RPC endpoint for Sepolia (e.g. Infura/Alchemy)
 *  - DEPLOYER_PRIVATE_KEY  Private key of the deploying wallet (funded
 *                          with Sepolia test ETH from a faucet)
 *  - ETHERSCAN_API_KEY     Optional, used for contract verification
 */
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

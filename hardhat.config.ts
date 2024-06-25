import * as dotenv from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@atixlabs/hardhat-time-n-mine";
import "hardhat-contract-sizer";
import "hardhat-storage-layout";
import "hardhat-gas-reporter";
import { execSync } from "child_process";
import { ethers } from "ethers";

dotenv.config();

const { PRIVATE_KEY, SCAN_API_KEY, REPORT_GAS, CMC_API } = process.env;

const privateKey = PRIVATE_KEY ?? "NO_KEY";
const scanKey = SCAN_API_KEY ?? "NO_KEY";

task("slither", "Runs slither").setAction(async () => {
    try {
        const stdout = execSync(`
            docker run \
            --rm \
            -v ${process.cwd()}:/share \
            -w /share \
            --entrypoint bash \
            trailofbits/eth-security-toolbox \
            -c "slither . --config-file ./slither.json  &> ./audits/slither.md"
        `);
        console.log(stdout.toString());
    } catch (stderr) {
        console.error(stderr?.toString());
    }
});

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.25",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            accounts: [
                { privateKey, balance: "10000000000000000000000" },
                {
                    privateKey: ethers.Wallet.createRandom().privateKey,
                    balance: "10000000000000000000000",
                },
            ],
        },
        homestead: {
            accounts: [privateKey],
            chainId: 1,
            url: "https://eth.llamarpc.com",
        },
        bsc: {
            accounts: [privateKey],
            chainId: 56,
            url: "https://binance.llamarpc.com",
        },
        base: {
            accounts: [privateKey],
            chainId: 8453,
            url: "https://base.llamarpc.com",
        },
        sepolia: {
            accounts: [privateKey],
            chainId: 11155111,
            url: "https://ethereum-sepolia-rpc.publicnode.com",
        },
        bscTestnet: {
            accounts: [privateKey],
            chainId: 97,
            url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
        },
        baseSepolia: {
            accounts: [privateKey],
            chainId: 84532,
            url: "https://base-sepolia.blockpi.network/v1/rpc/public",
        },
    },
    etherscan: {
        apiKey: scanKey,
    },
    gasReporter: {
        enabled: REPORT_GAS !== undefined,
        currency: "USD",
        coinmarketcap: CMC_API,
    },
    // dodoc: {
    //     runOnCompile: false,
    // },
    contractSizer: {
        only: [
            "ICOUpgradable",
            "MultiRoundICOUpgradable",
            "VestingICOUpgradable",
            "FlashICO",
        ],
    },
};

export default config;

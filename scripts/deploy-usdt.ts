import { ethers, network, upgrades } from "hardhat";

import { MockToken } from "../typechain-types";
import * as utils from "../utils";

const PATH = "addresses.json";

async function main() {
    const chainId = network.config.chainId!;

    const addresses = await utils.load<utils.Addresses>(PATH);

    const USDT = await ethers.getContractFactory("MockToken");
    const usdt = (await upgrades.deployProxy(USDT)) as unknown as MockToken;

    utils.reshape(
        addresses,
        {
            USDT: await usdt.getAddress(),
        },
        chainId,
    );

    await utils.dump(PATH, addresses);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

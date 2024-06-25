import { ethers, network, upgrades } from "hardhat";

import { FlashICO } from "../typechain-types";
import * as utils from "../utils";

const PATH = "addresses.json";

async function main() {
    const [owner] = await ethers.getSigners();
    const chainId = network.config.chainId!;

    const addresses = await utils.load<utils.Addresses>(PATH);

    const nativeRate = 100n;
    const duration = BigInt(24 * 60 * 60);
    const marginDuration = BigInt(24 * 2 * 60 * 60);
    const vestingRounds = 10n;

    const ICO = await ethers.getContractFactory("FlashICO");
    const ico = (await upgrades.deployProxy(ICO, [
        owner.address,
        addresses[chainId].Flash,
        nativeRate,
        duration,
        marginDuration,
        vestingRounds,
    ])) as unknown as FlashICO;

    utils.reshape(
        addresses,
        {
            ICO: await ico.getAddress(),
        },
        chainId,
    );

    await utils.dump(PATH, addresses);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

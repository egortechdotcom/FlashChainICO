import { ethers, network, upgrades } from "hardhat";

import { Flash } from "../typechain-types";
import * as utils from "../utils";

const PATH = "addresses.json";

async function main() {
    const [owner] = await ethers.getSigners();
    const chainId = network.config.chainId!;

    const addresses = await utils.load<utils.Addresses>(PATH);

    const Flash = await ethers.getContractFactory("Flash");
    const flash = (await upgrades.deployProxy(Flash, [
        owner.address,
    ])) as unknown as Flash;

    utils.reshape(
        addresses,
        {
            Flash: await flash.getAddress(),
        },
        chainId,
    );

    await utils.dump(PATH, addresses);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

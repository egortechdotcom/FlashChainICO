import { ethers, network } from "hardhat";

import { Flash, FlashICO, MockToken } from "../typechain-types";
import * as utils from "../utils";

const PATH = "addresses.json";

async function main() {
    // const [owner] = await ethers.getSigners();
    const chainId = network.config.chainId!;

    const addresses = await utils.load<utils.Addresses>(PATH);

    // Contracts
    const ICO = await ethers.getContractFactory("FlashICO");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const ico = ICO.attach(addresses[chainId].ICO) as unknown as FlashICO;

    const Flash = await ethers.getContractFactory("Flash");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const flash = Flash.attach(addresses[chainId].Flash) as unknown as Flash;

    const USDT = await ethers.getContractFactory("MockToken");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const usdt = USDT.attach(addresses[chainId].USDT) as unknown as MockToken;

    const supplies = Array.from({ length: 10 }, () =>
        ethers.parseEther("10000000"),
    );
    const rates = [50, 40, 25, 20, 16, 12.5, 10, 10, 10, 10].map(
        (val) => val * 10000,
    );
    await (await ico.setRoundsInfo(supplies, rates)).wait();

    // console.log(
    //     await ico.getClaimable("0x318a44BAb1DDebc6B673EC45E4DC6EE208f57c41"),
    // );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

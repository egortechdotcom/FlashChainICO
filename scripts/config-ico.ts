import { ethers, network } from "hardhat";

import { Flash, FlashICO } from "../typechain-types";
import * as utils from "../utils";

const PATH = "addresses.json";

async function main() {
    // const [owner] = await ethers.getSigners();
    const chainId = network.config.chainId!;

    const addresses = await utils.load<utils.Addresses>(PATH);

    // Contracts
    const ICO = await ethers.getContractFactory("FlashICO");
    const ico = ICO.attach(addresses[chainId].ICO) as unknown as FlashICO;

    const Flash = await ethers.getContractFactory("Flash");
    const flash = Flash.attach(addresses[chainId].Flash) as unknown as Flash;

    const STABLECOIN = addresses[chainId].STABLECOIN;
    const SIGNER = addresses[chainId].SIGNER;

    // Variables
    const rate = 66700n;
    const supply = ethers.parseEther("500000000");

    await (await ico.setICOInfo(supply, rate)).wait();

    await (await ico.addPurchaseToken(STABLECOIN)).wait();

    await (await flash.approve(await ico.getAddress(), supply)).wait();
    await (await ico.depositFlash(supply)).wait();

    await (await ico.setSigner(SIGNER)).wait();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import { Flash, MockMultiRoundICO, MockToken } from "../../typechain-types";

describe("MultiRoundICOUpgradable", function () {
    async function fixture() {
        const [owner] = await ethers.getSigners();

        const bpm = 10_000n;

        const ICO = await ethers.getContractFactory("MockMultiRoundICO");
        const ico = (await upgrades.deployProxy(
            ICO,
        )) as unknown as MockMultiRoundICO;

        const USDT = await ethers.getContractFactory("MockToken");
        const usdt = (await upgrades.deployProxy(USDT)) as unknown as MockToken;

        const Flash = await ethers.getContractFactory("Flash");
        const flash = (await upgrades.deployProxy(Flash, [
            owner.address,
        ])) as unknown as Flash;

        await (await usdt.mint(owner.address, ethers.MaxUint256)).wait();

        await (await flash.mint(owner.address, ethers.MaxUint256)).wait();
        await (
            await flash.approve(await ico.getAddress(), ethers.MaxUint256)
        ).wait();

        return { ico, flash, usdt, owner, bpm };
    }

    async function ConfiguredFixture() {
        const { ico, flash, usdt, owner, bpm } = await loadFixture(fixture);

        const nativeRate = 100n;
        const rate = 20_0_000n;
        const supply = ethers.parseEther("10000000");

        await (await ico.setNativeTokenRate(nativeRate)).wait();
        const rounds = await ico.rounds();
        for (let round = 0; round < rounds; ++round) {
            await (await ico.setICOInfo(round, supply, rate)).wait();
        }
        await (await ico.addPurchaseToken(ethers.ZeroAddress)).wait();
        await (await ico.addPurchaseToken(await usdt.getAddress())).wait();
        await (await ico.setQuoteToken(await flash.getAddress())).wait();

        await (await ico.depositToken(await flash.getAddress(), supply)).wait();

        return { ico, usdt, owner, nativeRate, rate, supply, rounds, bpm };
    }

    describe("Deployment", function () {
        it("Should not be initialized more than once", async function () {
            const { ico } = await loadFixture(fixture);

            await expect(ico.initialize()).to.be.revertedWithCustomError(
                ico,
                "InvalidInitialization",
            );
        });
    });

    describe("ICO Info", function () {
        it("Should be able to update ICO info", async function () {
            const { ico } = await loadFixture(fixture);

            const rate = 100;
            const round = 0;
            const supply = ethers.parseEther("10000000");

            await (await ico.setICOInfo(round, supply, rate)).wait();

            const info = await ico.ICOInfo();

            expect(info.supply).to.be.equal(supply);
            expect(info.exchangeRate).to.be.equal(rate);
        });

        it("Should revert on setting incorrect ICO info round", async function () {
            const { ico } = await loadFixture(fixture);

            const rate = 100;
            const round = 10;
            const supply = ethers.parseEther("10000000");

            await expect(
                ico.setICOInfo(round, supply, rate),
            ).to.be.revertedWithCustomError(ico, "IncorrectRoundError");
        });

        it("Should be able to set all rounds info", async function () {
            const { ico } = await loadFixture(fixture);

            const rounds = 2;
            const rates = Array.from({ length: rounds }, () => 100);
            const supplies = Array.from({ length: rounds }, () =>
                ethers.parseEther("10000000"),
            );

            await (await ico.setRoundsInfo(supplies, rates)).wait();

            const info = await ico.ICOInfo();

            expect(info.supply).to.be.equal(supplies[0]);
            expect(info.exchangeRate).to.be.equal(rates[0]);
        });
    });

    describe("Buy", function () {
        it("Should be able to buy with native token", async function () {
            const { ico, owner, nativeRate, rate, bpm } =
                await loadFixture(ConfiguredFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await expect(
                ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                }),
            ).to.changeEtherBalances([owner, ico], [-amount, amount]);

            const accounting = await ico.accountingOf(owner.address);
            expect(accounting.bought).to.be.equal(
                (amount * nativeRate * rate) / bpm,
            );
            expect(accounting.claimed).to.be.equal(0);

            const info = await ico.ICOInfo();
            expect(info.raised).to.be.equal((amount * nativeRate * rate) / bpm);
        });

        it("Should update current round when raised amount reaches the supply", async function () {
            const { ico, usdt, owner, rate, supply, bpm } =
                await loadFixture(ConfiguredFixture);

            const tokenAddress = await usdt.getAddress();
            const amount = (supply / rate) * bpm;
            const currentRound = await ico.currentRound();

            await (await usdt.approve(await ico.getAddress(), amount)).wait();
            await expect(
                ico.buy(tokenAddress, owner.address, amount),
            ).to.changeTokenBalances(usdt, [owner, ico], [-amount, amount]);

            const info = await ico.roundsInfo(currentRound);
            expect(info.raised).to.be.equal(info.supply);

            const updatedCurrentRound = await ico.currentRound();
            expect(updatedCurrentRound).to.be.equal(currentRound + 1n);
        });

        it("Should not let to set a round supply to an amount lower than the raised", async function () {
            const { ico, usdt, owner, rate } =
                await loadFixture(ConfiguredFixture);

            const tokenAddress = await usdt.getAddress();
            const amount = ethers.parseEther("1000");
            const currentRound = await ico.currentRound();

            await (await usdt.approve(await ico.getAddress(), amount)).wait();
            await (await ico.buy(tokenAddress, owner.address, amount)).wait();

            const info = await ico.roundsInfo(currentRound);

            await expect(
                ico.setICOInfo(0, info.raised, rate),
            ).to.be.revertedWithCustomError(ico, "BadSupplyError");
        });
    });
});

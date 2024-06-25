import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, timeAndMine, upgrades } from "hardhat";

import { Flash, MockToken, MockVestingICO } from "../../typechain-types";

describe("VestingICOUpgradable", function () {
    async function fixture() {
        const [owner] = await ethers.getSigners();

        const ICO = await ethers.getContractFactory("MockVestingICO");
        const ico = (await upgrades.deployProxy(
            ICO,
        )) as unknown as MockVestingICO;

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

        return { ico, flash, usdt, owner };
    }

    async function ConfiguredFixture() {
        const { ico, flash, usdt, owner } = await loadFixture(fixture);

        const nativeRate = 100n;
        const rate = 20_0_000n;
        const supply = ethers.parseEther("10000000");
        const duration = BigInt(24 * 60 * 60);
        const marginDuration = BigInt(24 * 2 * 60 * 60);
        const rounds = 10n;
        const bpm = 10_000n;

        await (await ico.setNativeTokenRate(nativeRate)).wait();
        await (await ico.setICOInfo(supply, rate)).wait();
        await (await ico.addPurchaseToken(ethers.ZeroAddress)).wait();
        await (await ico.addPurchaseToken(await usdt.getAddress())).wait();
        await (await ico.setQuoteToken(await flash.getAddress())).wait();

        await (await ico.setVestingDuration(duration)).wait();
        await (await ico.setVestingMarginDuration(marginDuration)).wait();
        await (await ico.setVestingRounds(rounds)).wait();

        await (await ico.depositToken(await flash.getAddress(), supply)).wait();

        return {
            ico,
            flash,
            usdt,
            owner,
            nativeRate,
            rate,
            supply,
            duration,
            marginDuration,
            rounds,
            bpm,
        };
    }

    async function EnabledVestingFixture() {
        const {
            ico,
            flash,
            usdt,
            owner,
            nativeRate,
            rate,
            supply,
            duration,
            rounds,
            marginDuration,
            bpm,
        } = await loadFixture(ConfiguredFixture);

        await (await ico.hardStartVesting()).wait();

        return {
            ico,
            flash,
            usdt,
            owner,
            nativeRate,
            rate,
            supply,
            duration,
            marginDuration,
            rounds,
            bpm,
        };
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

    describe("Vesting Info", function () {
        it("Should be able to update vesting info", async function () {
            const { ico } = await loadFixture(fixture);

            const duration = 24 * 60 * 60;
            const marginDuration = 24 * 2 * 60 * 60;
            const rounds = 11;

            await (await ico.setVestingDuration(duration)).wait();
            await (await ico.setVestingMarginDuration(marginDuration)).wait();
            await (await ico.setVestingRounds(rounds)).wait();

            const vestingRounds = await ico.vestingRounds();
            const vestingDuration = await ico.vestingDuration();
            const vestingMarginDuration = await ico.vestingMarginDuration();

            expect(rounds).to.be.equal(vestingRounds);
            expect(duration).to.be.equal(vestingDuration);
            expect(marginDuration).to.be.equal(vestingMarginDuration);
        });

        it("Should revert to put zero for duration and rounds", async function () {
            const { ico } = await loadFixture(fixture);

            const duration = 0;
            const rounds = 0;

            await expect(
                ico.setVestingDuration(duration),
            ).to.be.revertedWithCustomError(ico, "OnlyPositiveError");

            await expect(
                ico.setVestingRounds(rounds),
            ).to.be.revertedWithCustomError(ico, "OnlyPositiveError");
        });

        it("Should be able to hard start the vesting", async function () {
            const { ico } = await loadFixture(fixture);

            const isVestingStarted = await ico.vestingStarted();
            expect(isVestingStarted).to.be.false;

            await (await ico.hardStartVesting()).wait();

            const updatedIsVestingStarted = await ico.vestingStarted();
            expect(updatedIsVestingStarted).to.be.true;
        });
    });

    describe("Claim", function () {
        it("Claimable should be zero when vesting is not started", async function () {
            const { ico, owner } = await loadFixture(ConfiguredFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            const claimable = await ico.getClaimable(owner.address);
            expect(claimable).to.be.equal(0);
        });

        it("Claimable should be zero right after buying", async function () {
            const { ico, owner } = await loadFixture(EnabledVestingFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            const claimable = await ico.getClaimable(owner.address);
            expect(claimable).to.be.equal(0);
        });

        it("Claimable should be zero after a duration less than vesting duration", async function () {
            const { ico, owner, duration } = await loadFixture(
                EnabledVestingFixture,
            );

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await timeAndMine.setTimeIncrease((duration * 9n) / 10n);
            await timeAndMine.mine(1);

            const claimable = await ico.getClaimable(owner.address);
            expect(claimable).to.be.equal(0);
        });

        it("Claimable should be zero after a duration less than vesting margin duration", async function () {
            const { ico, owner, duration, marginDuration } = await loadFixture(
                EnabledVestingFixture,
            );

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");
            const totalDuration = duration + marginDuration;

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await timeAndMine.setTimeIncrease((totalDuration * 9n) / 10n);
            await timeAndMine.mine(1);

            const claimable = await ico.getClaimable(owner.address);
            expect(claimable).to.be.equal(0);
        });

        it("Claimable should be 1/rounds after the vesting duration", async function () {
            const {
                ico,
                owner,
                nativeRate,
                rate,
                duration,
                marginDuration,
                rounds,
                bpm,
            } = await loadFixture(EnabledVestingFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");
            const flashAmount = (amount * nativeRate * rate) / bpm;
            const claimableFlashAmount = flashAmount / rounds;

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await timeAndMine.setTimeIncrease(marginDuration + duration);
            await timeAndMine.mine(1);

            const claimable = await ico.getClaimable(owner.address);
            expect(claimable).to.be.equal(claimableFlashAmount);
        });

        it("Should update claimable partially", async function () {
            const { ico, owner, duration, marginDuration } = await loadFixture(
                EnabledVestingFixture,
            );

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await timeAndMine.setTimeIncrease(marginDuration + duration);
            await timeAndMine.mine(1);

            const totalClaimable = await ico.getClaimable(owner.address);
            const amountToClaim = totalClaimable / 10n;

            await (await ico.claim(owner.address, amountToClaim)).wait();

            const claimable = await ico.getClaimable(owner.address);

            expect(totalClaimable - amountToClaim).to.be.equal(claimable);
        });

        it("Should be able to claim fully", async function () {
            const { ico, owner, duration, marginDuration } = await loadFixture(
                EnabledVestingFixture,
            );

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await timeAndMine.setTimeIncrease(marginDuration + duration);
            await timeAndMine.mine(1);

            const claimable = await ico.getClaimable(owner.address);
            await (await ico.claim(owner.address, claimable)).wait();

            const currentClaimable = await ico.getClaimable(owner.address);
            expect(currentClaimable).to.be.equal(0);
        });

        it("Should revert on more than claimable amounts", async function () {
            const { ico, owner, duration, marginDuration } = await loadFixture(
                EnabledVestingFixture,
            );

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await timeAndMine.setTimeIncrease(marginDuration + duration);
            await timeAndMine.mine(1);

            const claimable = await ico.getClaimable(owner.address);
            await expect(
                ico.claim(owner.address, claimable + 1n),
            ).to.be.revertedWithCustomError(ico, "ExceedsClaimableError");
        });
    });
});

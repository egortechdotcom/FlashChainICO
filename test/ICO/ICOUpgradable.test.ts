import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import { Flash, MockICO, MockToken } from "../../typechain-types";

describe("ICOUpgradable", function () {
    async function fixture() {
        const [owner] = await ethers.getSigners();

        const bpm = 10_000n;

        const ICO = await ethers.getContractFactory("MockICO");
        const ico = (await upgrades.deployProxy(ICO)) as unknown as MockICO;

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
        await (await ico.setICOInfo(supply, rate)).wait();
        await (await ico.addPurchaseToken(ethers.ZeroAddress)).wait();
        await (await ico.addPurchaseToken(await usdt.getAddress())).wait();
        await (await ico.setQuoteToken(await flash.getAddress())).wait();

        await (await ico.depositToken(await flash.getAddress(), supply)).wait();

        return { ico, usdt, owner, nativeRate, rate, supply, bpm };
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

    describe("Token Management", function () {
        it("Should not accept a random token as purchase token", async function () {
            const { ico } = await loadFixture(fixture);

            const tokenAddress = ethers.ZeroAddress;

            expect(await ico.purchaseTokens(tokenAddress)).to.be.false;
        });

        it("Should be able to add and remove a purchase token", async function () {
            const { ico } = await loadFixture(fixture);

            const tokenAddress = ethers.ZeroAddress;

            await (await ico.addPurchaseToken(tokenAddress)).wait();
            expect(await ico.purchaseTokens(tokenAddress)).to.be.true;

            await (await ico.removePurchaseToken(tokenAddress)).wait();
            expect(await ico.purchaseTokens(tokenAddress)).to.be.false;
        });

        it("Should revert on adding the same purchase token twice", async function () {
            const { ico } = await loadFixture(fixture);

            const tokenAddress = ethers.ZeroAddress;

            await (await ico.addPurchaseToken(tokenAddress)).wait();

            await expect(
                ico.addPurchaseToken(tokenAddress),
            ).to.be.revertedWithCustomError(ico, "AlreadyEnabledError");
        });

        it("Should revert on removing a non purchase token", async function () {
            const { ico } = await loadFixture(fixture);

            const tokenAddress = ethers.ZeroAddress;

            await expect(
                ico.removePurchaseToken(tokenAddress),
            ).to.be.revertedWithCustomError(ico, "AlreadyDisabledError");
        });

        it("Should be able to update native token rate", async function () {
            const { ico } = await loadFixture(fixture);

            const rate = 100;

            await (await ico.setNativeTokenRate(rate)).wait();
            expect(await ico.nativeTokenExchangeRate()).to.be.equal(rate);
        });

        it("Should revert on setting the native rate to zero", async function () {
            const { ico } = await loadFixture(fixture);

            const rate = 0;

            await expect(
                ico.setNativeTokenRate(rate),
            ).to.be.revertedWithCustomError(ico, "OnlyPositiveError");
        });

        it("Should accept depositing any token", async function () {
            const { ico, usdt, owner } = await loadFixture(fixture);

            const amount = ethers.parseEther("10");

            await (await usdt.approve(await ico.getAddress(), amount)).wait();

            await expect(
                ico.depositToken(await usdt.getAddress(), amount),
            ).to.changeTokenBalances(usdt, [owner, ico], [-amount, amount]);
        });

        it("Should allow to withdraw deposited tokens", async function () {
            const { ico, usdt, owner } = await loadFixture(fixture);

            const amount = ethers.parseEther("10");

            await (await usdt.approve(await ico.getAddress(), amount)).wait();

            await (
                await ico.depositToken(await usdt.getAddress(), amount)
            ).wait();

            await expect(
                ico.withdrawToken(
                    await usdt.getAddress(),
                    owner.address,
                    amount,
                ),
            ).to.changeTokenBalances(usdt, [owner, ico], [amount, -amount]);
        });

        it("Should allow depositing and withdrawing native token", async function () {
            const { ico, owner } = await loadFixture(fixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (await ico.addPurchaseToken(tokenAddress)).wait();

            await expect(
                owner.sendTransaction({
                    to: await ico.getAddress(),
                    value: amount,
                }),
            ).to.changeEtherBalances([owner, ico], [-amount, amount]);

            await expect(
                ico.withdrawNativeToken(owner.address, amount),
            ).to.changeEtherBalances([owner, ico], [amount, -amount]);
        });
    });

    describe("ICO Info", function () {
        it("Should be able to update ICO info", async function () {
            const { ico } = await loadFixture(fixture);

            const rate = 20_0_000n;
            const supply = ethers.parseEther("10000000");

            await (await ico.setICOInfo(supply, rate)).wait();

            const info = await ico.ICOInfo();

            expect(info.supply).to.be.equal(supply);
            expect(info.exchangeRate).to.be.equal(rate);
        });

        it("Should calculate the quote amount of native token correctly", async function () {
            const { ico, bpm } = await loadFixture(fixture);

            const tokenAddress = ethers.ZeroAddress;
            const nativeRate = 100n;
            const rate = 20_0_000n;
            const supply = ethers.parseEther("10000000");
            const amount = ethers.parseEther("10");

            await (await ico.setNativeTokenRate(nativeRate)).wait();
            await (await ico.setICOInfo(supply, rate)).wait();
            await (await ico.addPurchaseToken(tokenAddress)).wait();

            expect(await ico.getQuoteAmount(tokenAddress, amount)).to.be.equal(
                (amount * nativeRate * rate) / bpm,
            );
        });

        it("Should calculate the quote amount of usdt correctly", async function () {
            const { ico, usdt, bpm } = await loadFixture(fixture);

            const tokenAddress = await usdt.getAddress();
            const nativeRate = 100n;
            const rate = 20_0_000n;
            const supply = ethers.parseEther("10000000");
            const amount = ethers.parseEther("10");

            await (await ico.setNativeTokenRate(nativeRate)).wait();
            await (await ico.setICOInfo(supply, rate)).wait();
            await (await ico.addPurchaseToken(tokenAddress)).wait();

            expect(await ico.getQuoteAmount(tokenAddress, amount)).to.be.equal(
                (amount * rate) / bpm,
            );
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

        it("Should revert when value is less than expected", async function () {
            const { ico, owner } = await loadFixture(ConfiguredFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await expect(
                ico.buy(tokenAddress, owner.address, amount, {
                    value: amount - 1n,
                }),
            ).to.be.revertedWithCustomError(ico, "InsufficientPurchaseAmount");
        });

        it("Should be able to buy with usdt", async function () {
            const { ico, usdt, owner, rate, bpm } =
                await loadFixture(ConfiguredFixture);

            const tokenAddress = await usdt.getAddress();
            const amount = ethers.parseEther("10");

            await (await usdt.approve(await ico.getAddress(), amount)).wait();
            await expect(
                ico.buy(tokenAddress, owner.address, amount),
            ).to.changeTokenBalances(usdt, [owner, ico], [-amount, amount]);

            const accounting = await ico.accountingOf(owner.address);
            expect(accounting.bought).to.be.equal((amount * rate) / bpm);
            expect(accounting.claimed).to.be.equal(0);

            const info = await ico.ICOInfo();
            expect(info.raised).to.be.equal((amount * rate) / bpm);
        });

        it("Should revert if the token is not acceptable", async function () {
            const { ico, usdt, owner } = await loadFixture(ConfiguredFixture);

            const amount = ethers.parseEther("10");

            await (
                await ico.removePurchaseToken(await usdt.getAddress())
            ).wait();

            await (await usdt.approve(await ico.getAddress(), amount)).wait();
            await expect(
                ico.buy(await usdt.getAddress(), owner.address, amount),
            ).to.be.revertedWithCustomError(ico, "BadTokenError");
        });

        it("Should revert if exceeds ICO supply", async function () {
            const { ico, usdt, owner, supply } =
                await loadFixture(ConfiguredFixture);

            const amount = supply + 1n;

            await (await usdt.approve(await ico.getAddress(), amount)).wait();
            await expect(
                ico.buy(await usdt.getAddress(), owner.address, amount),
            ).to.be.revertedWithCustomError(ico, "ExceedsSupplyError");
        });

        it("Should be able to reach the supply", async function () {
            const { ico, usdt, owner, rate, supply, bpm } =
                await loadFixture(ConfiguredFixture);

            const tokenAddress = await usdt.getAddress();
            const amount = (supply / rate) * bpm;

            await (await usdt.approve(await ico.getAddress(), amount)).wait();
            await expect(
                ico.buy(tokenAddress, owner.address, amount),
            ).to.changeTokenBalances(usdt, [owner, ico], [-amount, amount]);

            const info = await ico.ICOInfo();
            expect(info.raised).to.be.equal(info.supply);
        });
    });

    describe("Claim", function () {
        it("Should calculate total claimable correctly", async function () {
            const { ico, owner, nativeRate, rate, bpm } =
                await loadFixture(ConfiguredFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            const claimable = await ico.getClaimable(owner.address);
            expect(claimable).to.be.equal((amount * nativeRate * rate) / bpm);
        });

        it("Should update claimable partially", async function () {
            const { ico, owner } = await loadFixture(ConfiguredFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");
            const ownerAddress = owner.address;

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            const totalClaimable = await ico.getClaimable(ownerAddress);
            const amountToClaim = totalClaimable / 10n;

            await (await ico.claim(ownerAddress, amountToClaim)).wait();

            const claimable = await ico.getClaimable(ownerAddress);

            expect(totalClaimable - amountToClaim).to.be.equal(claimable);
        });

        it("Should be able to claim fully", async function () {
            const { ico, owner } = await loadFixture(ConfiguredFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            const claimable = await ico.getClaimable(owner.address);
            await (await ico.claim(owner.address, claimable)).wait();

            const currentClaimable = await ico.getClaimable(owner.address);
            expect(currentClaimable).to.be.equal(0);
        });

        it("Should revert on more than claimable amounts", async function () {
            const { ico, owner } = await loadFixture(ConfiguredFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            const claimable = await ico.getClaimable(owner.address);
            await expect(
                ico.claim(owner.address, claimable + 1n),
            ).to.be.revertedWithCustomError(ico, "ExceedsClaimableError");
        });
    });
});

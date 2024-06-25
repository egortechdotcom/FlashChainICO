import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, timeAndMine, upgrades } from "hardhat";

import { Flash, FlashICO, MockToken } from "../typechain-types";
import * as utils from "../utils";

const SIGNER = "0x2fCAb633adFA6aF8266025D63228047033c3ceD0";
const NAME = "Test";
const ID = "k6yab1Ige4F833bsxzvHYl8AjG1vb414y7U9GWBMu2o";
const MESSAGE = `I authorize ${NAME} (${ID}) to get a proof from Fractal that:
- I passed KYC level plus
- I am not a citizen of the following countries: United States of America (US), Cuba (CU), Iran (IR), Democratic People's Republic of Korea (KP), Sudan (SD), Syria (SY)
- I am not a resident of the following countries: United States of America (US), Cuba (CU), Iran (IR), Democratic People's Republic of Korea (KP), Sudan (SD), Syria (SY)`;

describe("FlashICO", function () {
    async function fixture() {
        const [owner, alice] = await ethers.getSigners();

        const nativeRate = 100n;
        const duration = BigInt(24 * 60 * 60);
        const marginDuration = BigInt(24 * 2 * 60 * 60);
        const vestingRounds = 10n;
        const bpm = 10000n;

        const USDT = await ethers.getContractFactory("MockToken");
        const usdt = (await upgrades.deployProxy(USDT)) as unknown as MockToken;

        const Flash = await ethers.getContractFactory("Flash");
        const flash = (await upgrades.deployProxy(Flash, [
            owner.address,
        ])) as unknown as Flash;

        const ICO = await ethers.getContractFactory("FlashICO");
        const ico = (await upgrades.deployProxy(ICO, [
            owner.address,
            await flash.getAddress(),
            nativeRate,
            duration,
            marginDuration,
            vestingRounds,
        ])) as unknown as FlashICO;

        await (await usdt.mint(owner.address, ethers.MaxUint256)).wait();

        await (await flash.mint(owner.address, ethers.MaxUint256)).wait();
        await (
            await flash.approve(await ico.getAddress(), ethers.MaxUint256)
        ).wait();

        return {
            ico,
            flash,
            usdt,
            owner,
            alice,
            nativeRate,
            duration,
            marginDuration,
            vestingRounds,
            bpm,
        };
    }

    async function ConfiguredFixture() {
        const {
            ico,
            flash,
            usdt,
            owner,
            alice,
            nativeRate,
            duration,
            marginDuration,
            vestingRounds,
            bpm,
        } = await loadFixture(fixture);

        const rate = 20_0_000n;
        const supply = ethers.parseEther("100000");

        await (await ico.setICOInfo(supply, rate)).wait();
        await (await ico.addPurchaseToken(ethers.ZeroAddress)).wait();
        await (await ico.addPurchaseToken(await usdt.getAddress())).wait();

        await (await ico.depositFlash(supply)).wait();

        return {
            ico,
            flash,
            usdt,
            owner,
            alice,
            nativeRate,
            rate,
            supply,
            duration,
            marginDuration,
            vestingRounds,
            bpm,
        };
    }

    async function EnabledBuyingFixture() {
        const { ico, ...rest } = await loadFixture(ConfiguredFixture);

        await (await ico.unpause()).wait();

        return {
            ico,
            ...rest,
        };
    }

    async function EnabledClaimingFixture() {
        const { ico, owner, ...rest } = await loadFixture(EnabledBuyingFixture);

        await (await ico.setSigner(SIGNER)).wait();

        const signature = await owner.signMessage(MESSAGE);
        const response = await utils.fetchCredential(MESSAGE, signature);

        const credentials = (await response.json()) as utils.Credentials;

        if (!response.ok) {
            throw new Error(JSON.stringify(credentials));
        }

        return {
            ico,
            owner,
            credentials,
            ...rest,
        };
    }

    describe("Deployment", function () {
        it("Should not be initialized more than once", async function () {
            const {
                ico,
                flash,
                owner,
                nativeRate,
                duration,
                marginDuration,
                vestingRounds,
            } = await loadFixture(fixture);

            await expect(
                ico.initialize(
                    owner.address,
                    await flash.getAddress(),
                    nativeRate,
                    duration,
                    marginDuration,
                    vestingRounds,
                ),
            ).to.be.revertedWithCustomError(ico, "InvalidInitialization");
        });
    });

    describe("Token Management", function () {
        it("Only owner should be able to add purchase tokens", async function () {
            const { ico, alice } = await loadFixture(fixture);

            const tokenAddress = ethers.ZeroAddress;

            await (await ico.addPurchaseToken(tokenAddress)).wait();

            await expect(
                ico.connect(alice).addPurchaseToken(tokenAddress),
            ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");
        });

        it("Only owner should be able to remove purchase tokens", async function () {
            const { ico, alice } = await loadFixture(fixture);

            const tokenAddress = ethers.ZeroAddress;

            await (await ico.addPurchaseToken(tokenAddress)).wait();

            await expect(
                ico.connect(alice).removePurchaseToken(tokenAddress),
            ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");

            await (await ico.removePurchaseToken(tokenAddress)).wait();
        });

        it("Only owner should be able to update native token rate", async function () {
            const { ico, alice } = await loadFixture(fixture);

            const rate = 100;

            await (await ico.setNativeTokenRate(rate)).wait();
            expect(await ico.nativeTokenExchangeRate()).to.be.equal(rate);

            await expect(
                ico.connect(alice).setNativeTokenRate(rate),
            ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");
        });

        it("Only owner should be able to deposit flash", async function () {
            const { ico, alice } = await loadFixture(fixture);

            const amount = ethers.parseEther("10");

            await (await ico.depositFlash(amount)).wait();

            await expect(
                ico.connect(alice).depositFlash(amount),
            ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");
        });

        it("Only owner should be able to withdraw deposited tokens", async function () {
            const { ico, flash, owner, alice } = await loadFixture(fixture);

            const amount = ethers.parseEther("10");

            await (await ico.depositFlash(amount)).wait();

            await expect(
                ico.withdrawToken(
                    await flash.getAddress(),
                    owner.address,
                    amount,
                ),
            ).to.changeTokenBalances(flash, [owner, ico], [amount, -amount]);

            await expect(
                ico
                    .connect(alice)
                    .withdrawToken(
                        await flash.getAddress(),
                        owner.address,
                        amount,
                    ),
            ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");
        });
    });

    describe("ICO Info", function () {
        it("Only owner should be able to update ICO info", async function () {
            const { ico, alice } = await loadFixture(fixture);

            const rate = 100;
            const supply = ethers.parseEther("10000000");

            await (await ico.setICOInfo(supply, rate)).wait();

            const info = await ico.ICOInfo();

            expect(info.supply).to.be.equal(supply);
            expect(info.exchangeRate).to.be.equal(rate);

            await expect(
                ico.connect(alice).setICOInfo(supply, rate),
            ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");
        });

        it("Only owner should be able to unpause", async function () {
            const { ico, alice } = await loadFixture(ConfiguredFixture);

            await (await ico.unpause()).wait();

            await expect(
                ico.connect(alice).unpause(),
            ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");
        });

        it("Only owner should be able to pause", async function () {
            const { ico, alice } = await loadFixture(ConfiguredFixture);

            await (await ico.unpause()).wait();

            await expect(
                ico.connect(alice).pause(),
            ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");

            await (await ico.pause()).wait();
        });
    });

    describe("Vesting Info", function () {
        it("Only owner should be able to hard start the vesting", async function () {
            const { ico, alice } = await loadFixture(fixture);

            await (await ico.hardStartVesting()).wait();

            await expect(
                ico.connect(alice).hardStartVesting(),
            ).to.be.revertedWithCustomError(ico, "OwnableUnauthorizedAccount");
        });
    });

    describe("Buy", function () {
        it("Should be able to buy with native token", async function () {
            const { ico, owner, alice, nativeRate, rate, bpm } =
                await loadFixture(EnabledBuyingFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("1");

            await expect(
                ico.connect(alice).buy(tokenAddress, alice.address, amount, {
                    value: amount,
                }),
            ).to.changeEtherBalances([alice, owner], [-amount, amount]);

            const accounting = await ico.accountingOf(alice.address);
            expect(accounting.bought).to.be.equal(
                (amount * nativeRate * rate) / bpm,
            );
            expect(accounting.claimed).to.be.equal(0);

            const info = await ico.ICOInfo();
            expect(info.raised).to.be.equal((amount * nativeRate * rate) / bpm);
        });

        it("Should be able to buy by sending native token", async function () {
            const { ico, owner, alice, nativeRate, rate, bpm } =
                await loadFixture(EnabledBuyingFixture);

            const amount = ethers.parseEther("1");

            await expect(
                alice.sendTransaction({
                    to: await ico.getAddress(),
                    value: amount,
                }),
            ).to.changeEtherBalances([alice, owner], [-amount, amount]);

            const accounting = await ico.accountingOf(alice.address);
            expect(accounting.bought).to.be.equal(
                (amount * nativeRate * rate) / bpm,
            );
            expect(accounting.claimed).to.be.equal(0);

            const info = await ico.ICOInfo();
            expect(info.raised).to.be.equal((amount * nativeRate * rate) / bpm);
        });

        it("Should not let buying when the ICO is paused", async function () {
            const { ico, usdt, owner } = await loadFixture(ConfiguredFixture);

            const tokenAddress = await usdt.getAddress();
            const amount = ethers.parseEther("10");

            await expect(
                ico.buy(tokenAddress, owner.address, amount),
            ).to.be.revertedWithCustomError(ico, "EnforcedPause");
        });

        it("Should not let buying when vesting is started", async function () {
            const { ico, usdt, owner } =
                await loadFixture(EnabledBuyingFixture);

            const tokenAddress = await usdt.getAddress();
            const amount = ethers.parseEther("10");

            await (await ico.hardStartVesting()).wait();

            await expect(
                ico.buy(tokenAddress, owner.address, amount),
            ).to.be.revertedWithCustomError(ico, "VestingStartedError");
        });
    });

    describe("Claim", function () {
        it("Should prevent claiming if the contract is paused", async function () {
            const { ico, owner, credentials } = await loadFixture(
                EnabledClaimingFixture,
            );

            await (await ico.hardStartVesting()).wait();
            await (await ico.pause()).wait();

            await expect(
                ico.claim(
                    credentials.fractalId,
                    credentials.approvedAt,
                    credentials.validUntil,
                    credentials.proof,
                    owner.address,
                    1n,
                ),
            ).to.be.revertedWithCustomError(ico, "EnforcedPause");
        });

        it("Should automatically start vesting", async function () {
            const { ico, owner, nativeRate, rate, supply, bpm } =
                await loadFixture(EnabledClaimingFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = (supply / rate / nativeRate) * bpm;

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            const isVestingStarted = await ico.vestingStarted();
            expect(isVestingStarted).to.be.true;
        });

        it("Claimable should be zero right after buying", async function () {
            const { ico, owner } = await loadFixture(EnabledClaimingFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await (await ico.hardStartVesting()).wait();

            const claimable = await ico.getClaimable(owner.address);
            expect(claimable).to.be.equal(0);
        });

        it("Should be able to claim partially", async function () {
            const { ico, owner, duration, marginDuration, credentials } =
                await loadFixture(EnabledClaimingFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await (await ico.hardStartVesting()).wait();

            await timeAndMine.setTimeIncrease(marginDuration + duration);
            await timeAndMine.mine(1);

            const claimable = await ico.getClaimable(owner.address);

            await (
                await ico.claim(
                    credentials.fractalId,
                    credentials.approvedAt,
                    credentials.validUntil,
                    credentials.proof,
                    owner.address,
                    claimable,
                )
            ).wait();

            const currentClaimable = await ico.getClaimable(owner.address);
            expect(currentClaimable).to.be.equal(0);
        });

        it("Should be able to claim fully", async function () {
            const {
                ico,
                owner,
                duration,
                marginDuration,
                vestingRounds,
                credentials,
            } = await loadFixture(EnabledClaimingFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            await (
                await ico.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await (await ico.hardStartVesting()).wait();

            await timeAndMine.setTimeIncrease(marginDuration);
            await timeAndMine.mine(1);
            for (let round = 0; round < vestingRounds; ++round) {
                await timeAndMine.setTimeIncrease(duration);
                await timeAndMine.mine(1);

                const claimable = await ico.getClaimable(owner.address);
                await (
                    await ico.claim(
                        credentials.fractalId,
                        credentials.approvedAt,
                        credentials.validUntil,
                        credentials.proof,
                        owner.address,
                        claimable,
                    )
                ).wait();

                const currentClaimable = await ico.getClaimable(owner.address);
                expect(currentClaimable).to.be.equal(0);
            }
        });

        it("Only whitelisted wallets should be able to claim", async function () {
            const { ico, owner, alice, duration, marginDuration, credentials } =
                await loadFixture(EnabledClaimingFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            const aliceIco = ico.connect(alice);

            await (
                await aliceIco.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await (await ico.hardStartVesting()).wait();

            await timeAndMine.setTimeIncrease(marginDuration + duration);
            await timeAndMine.mine(1);

            const claimable = await aliceIco.getClaimable(alice.address);
            await expect(
                aliceIco.claim(
                    credentials.fractalId,
                    credentials.approvedAt,
                    credentials.validUntil,
                    credentials.proof,
                    owner.address,
                    claimable,
                ),
            ).to.be.revertedWithCustomError(ico, "NotVerifiedError");
        });

        it("Can't use other's proofs to claim", async function () {
            const { ico, owner, alice, duration, marginDuration, credentials } =
                await loadFixture(EnabledClaimingFixture);

            const tokenAddress = ethers.ZeroAddress;
            const amount = ethers.parseEther("10");

            const aliceIco = ico.connect(alice);

            await (
                await aliceIco.buy(tokenAddress, owner.address, amount, {
                    value: amount,
                })
            ).wait();

            await (await ico.hardStartVesting()).wait();

            await timeAndMine.setTimeIncrease(marginDuration + duration);
            await timeAndMine.mine(1);

            const claimable = await aliceIco.getClaimable(alice.address);
            await expect(
                aliceIco.claim(
                    credentials.fractalId,
                    credentials.approvedAt,
                    credentials.validUntil,
                    credentials.proof,
                    owner.address,
                    claimable,
                ),
            ).to.be.revertedWithCustomError(ico, "NotVerifiedError");
        });
    });
});

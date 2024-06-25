# Flash Chain Contracts

**All of the contracts are Transparent Proxies**

## Flash

Flash token is an ownable ERC-20 token which allows the owner to mint tokens.

### Interface

* `mint`: mint tokens and send to a specified wallet. in decimals format. e.g. to mint 100 tokens use 100 * 1e18.

## Flash ICO

Flash ICO is an ownable ICO with multi round investment and vesting features.

### Interface

* `pause`: pause the contract.
* `unpause`: unpause the contract.
* `addPurchaseToken`: add the address of token that can be used to purchase the FLash. **NOTE:** either zero address or stablecoin.
* `removePurchaseToken`: remove the purchase token.
* `setNativeTokenRate`: set native token to usd rate.
* `depositFlash`: deposit flash to the contract.
* `withdrawToken`: withdraw any token from the contract.
* `withdrawNativeToken`: withdraw native token from the contract.
* `ICOInfo`: get current round info.
* `setICOInfo`: configure a round of the ICO.
* `setRoundsInfo`: configure all rounds of the ICO in a single call.
* `getClaimable`: get current amount that a wallet can claim.
* `setVestingDuration`: set vesting round duration.
* `setVestingMarginDuration`: set margin duration of the vesting. margin duration is the time between ICO investment end and vesting start.
* `setVestingRounds`: set total number of vesting rounds.
* `hardStartVesting`: the vesting will be started when the the ICO amount is fully purchased. The owner can har start the vesting by hand.
* `setSigner`: set the fractal.id signer. please check [fractal.id](https://web.fractal.id/).
* `setCredentials`: changes the fractal.id credentials config. please check [fractal.id](https://web.fractal.id/).
* `buy`: invest in the ICO.
* `claim`: claim the amount which is claimable through vesting.

## Deployment

Deployment scripts use `addresses.json` file to store the contract addresses. If such file does not exist, create one at the root directory of the code base.

### Deploy flash contract

To deploy the Flash contract follow the below instructions:

1. run `hh compile`
2. run `hh run scripts/deploy-flash.ts`

### Deploy Flash ICO contract

To deploy the Flash ICO follow the below instructions:

1. run `hh compile`
2. set the ICO rounds in `MultiRoundICOUpgradable.sol` file.
3. set correct values for the following variables in `scripts/deploy-ico.ts` file:
    * `nativeRate`: native token to USD exchange rate. e.g. 100 means each native token equals $100.
    * `duration`: the duration of each round of vesting in seconds. e.g. 3600 means each round is 1 hour.
    * `marginDuration`: the vesting will start after ICO end time plus margin duration. marginDuration should be in seconds.
    * `vestingRounds`: defines how many rounds the vesting has.
4. run `hh run scripts/deploy-ico.ts`
5. configure the ICO contract:
    * `totalSupply`: the total ico amount of flash token.
    * the `setICOInfo` function should be called for each ICO round.
        * `round`: the ICO round which is being configured.
        * `supply`: the supply of the round.
        * `rate`: USD to Flash rate of the round in BPM format. to set the rate to 2, set rate to 2 x 10000, 20000.
        * **IMPORTANT NOTE:** Make sure that the result of `supply/rate` is a rational number.
        * *The `setRoundsInfo` function can be called to set the rounds info in one single call.*
    * the `addPurchaseToken` should be used to add the contract address of the tokens that can be used to purchase tokens in ICO.
    * Approve Flash token for the ICO contract.
    * The `depositFlash` function should be called to transfer Flash tokens to the ICO contract. Make sure the correct amount of Flash exists in the wallet.
    * `setSigner` function should be called to set the KYC signer wallet. please check [fractal.id](https://web.fractal.id/).
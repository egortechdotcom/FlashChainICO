// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {
    Initializable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    OwnableUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {
    PausableUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import { ICOUpgradable } from "./ICO/ICOUpgradable.sol";
import { VestingICOUpgradable } from "./ICO/VestingICOUpgradable.sol";
import { Verifiable } from "./access/Verifiable.sol";

contract FlashICO is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ICOUpgradable,
    VestingICOUpgradable,
    Verifiable
{
    error RequiresTokenRateError();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address initialOwner,
        address qToken,
        uint256 nativeRate,
        uint256 vDuration,
        uint256 vMarginDuration,
        uint256 vRounds
    ) external initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();

        __ICO_init();
        __VestingICO_init();
        __Verifiable_init();

        _pause();

        _setQuoteToken(qToken);
        _setNativeTokenRate(nativeRate);

        _setVestingDuration(vDuration);
        _setVestingMarginDuration(vMarginDuration);
        _setVestingRounds(vRounds);
    }

    function _receivePurchaseToken(
        address from,
        address purchaseToken,
        uint256 purchaseAmount
    ) internal virtual override {
        super._receivePurchaseToken(from, purchaseToken, purchaseAmount);
        if (purchaseToken == address(0)) {
            _withdrawNativeToken(owner(), purchaseAmount);
        } else {
            _withdrawToken(purchaseToken, owner(), purchaseAmount);
        }
    }

    function _setRaised(
        uint256 raised
    ) internal virtual override(ICOUpgradable) {
        super._setRaised(raised);
        if (icoInfo.raised == icoInfo.supply) {
            _hardStartVesting();
        }
    }

    function _claim(
        address from,
        address to,
        uint256 amountOut
    ) internal virtual override(ICOUpgradable, VestingICOUpgradable) {
        super._claim(from, to, amountOut);
    }

    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        Info memory info = ICOInfo();
        if (info.exchangeRate == 0) {
            revert RequiresTokenRateError();
        }

        _unpause();
    }

    function addPurchaseToken(address token) external onlyOwner {
        _addPurchaseToken(token);
    }

    function removePurchaseToken(address token) external onlyOwner {
        _removePurchaseToken(token);
    }

    function setNativeTokenRate(uint256 rate) external onlyOwner {
        _setNativeTokenRate(rate);
    }

    function depositFlash(uint256 amount) external onlyOwner {
        _depositToken(quoteToken, _msgSender(), amount);
    }

    function withdrawToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        _withdrawToken(token, to, amount);
    }

    function withdrawNativeToken(
        address to,
        uint256 amount
    ) external onlyOwner {
        _withdrawNativeToken(to, amount);
    }

    function ICOInfo()
        public
        view
        virtual
        override(ICOUpgradable)
        returns (Info memory info)
    {
        return super.ICOInfo();
    }

    function setICOInfo(
        uint256 supply,
        uint256 rate
    ) external onlyOwner whenVestingNotStarted {
        _setICOInfo(supply, rate);
    }

    function getClaimable(
        address from
    )
        public
        view
        virtual
        override(ICOUpgradable, VestingICOUpgradable)
        returns (uint256 claimable)
    {
        return super.getClaimable(from);
    }

    function setVestingDuration(uint256 duration) external onlyOwner {
        _setVestingDuration(duration);
    }

    function setVestingMarginDuration(
        uint256 marginDuration
    ) external onlyOwner {
        _setVestingMarginDuration(marginDuration);
    }

    function setVestingRounds(uint256 vRounds) external onlyOwner {
        _setVestingRounds(vRounds);
    }

    function hardStartVesting() external onlyOwner {
        _hardStartVesting();
    }

    function setSigner(address _signer) external onlyOwner {
        _setSigner(_signer);
    }

    function setCredentials(string memory credentials) external onlyOwner {
        _setCredentials(credentials);
    }

    function buy(
        address purchaseToken,
        address to,
        uint256 purchaseAmount
    ) external payable whenNotPaused whenVestingNotStarted {
        _buy(purchaseToken, _msgSender(), to, purchaseAmount);
    }

    receive() external payable whenNotPaused whenVestingNotStarted {
        address to = _msgSender();
        uint256 purchaseAmount = msg.value;
        _buy(address(0), _msgSender(), to, purchaseAmount);
    }

    function claim(
        string memory fractalId,
        uint256 approvedAt,
        uint256 validUntil,
        bytes calldata proof,
        address to,
        uint256 amountOut
    ) external whenNotPaused {
        address from = _msgSender();
        _requireVerified(from, fractalId, approvedAt, validUntil, proof);
        _claim(from, to, amountOut);
    }
}

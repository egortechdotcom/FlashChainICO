// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {
    Initializable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { MultiRoundICOUpgradable } from "../ICO/MultiRoundICOUpgradable.sol";

contract MockMultiRoundICO is Initializable, MultiRoundICOUpgradable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() external initializer {
        __MultiRoundICO_init();
    }

    function setQuoteToken(address token) external {
        _setQuoteToken(token);
    }

    function addPurchaseToken(address token) external {
        _addPurchaseToken(token);
    }

    function removePurchaseToken(address token) external {
        _removePurchaseToken(token);
    }

    function setNativeTokenRate(uint256 rate) external {
        _setNativeTokenRate(rate);
    }

    function depositToken(address token, uint256 amount) external {
        _depositToken(token, _msgSender(), amount);
    }

    function withdrawToken(address token, address to, uint256 amount) external {
        _withdrawToken(token, to, amount);
    }

    function withdrawNativeToken(address to, uint256 amount) external {
        _withdrawNativeToken(to, amount);
    }

    function setICOInfo(
        uint8 round,
        uint256 supply,
        uint256 rate
    ) external virtual {
        _setICOInfo(round, supply, rate);
    }

    function setRoundsInfo(
        uint256[rounds] calldata supplies,
        uint256[rounds] calldata rates
    ) external {
        _setRoundsInfo(supplies, rates);
    }

    function buy(
        address purchaseToken,
        address to,
        uint256 purchaseAmount
    ) external payable virtual {
        _buy(purchaseToken, _msgSender(), to, purchaseAmount);
    }

    receive() external payable {
        address to = _msgSender();
        uint256 purchaseAmount = msg.value;
        _buy(address(0), _msgSender(), to, purchaseAmount);
    }

    function claim(address to, uint256 amountOut) external virtual {
        _claim(_msgSender(), to, amountOut);
    }
}

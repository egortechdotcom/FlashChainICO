// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    Initializable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

contract ICOUpgradable is Initializable, ContextUpgradeable {
    error OnlyPositiveError();
    error AlreadyEnabledError();
    error AlreadyDisabledError();
    error BadTokenError();
    error InsufficientPurchaseAmount();
    error ExceedsSupplyError();
    error BadSupplyError();
    error ExceedsClaimableError();

    address public quoteToken;
    mapping(address => bool) public purchaseTokens;
    uint256 public nativeTokenExchangeRate;

    struct Accounting {
        uint256 bought;
        uint256 claimed;
    }
    mapping(address => Accounting) internal accountings;

    struct Info {
        uint256 supply;
        uint256 raised;
        uint256 exchangeRate;
    }
    Info icoInfo;

    uint256 constant bpm = 10_000;

    function __ICO_init() internal onlyInitializing {
        __ICO_init_unchained();
    }

    function __ICO_init_unchained() internal onlyInitializing {}

    function _setQuoteToken(address token) internal {
        if (token == address(0)) {
            revert BadTokenError();
        }

        quoteToken = token;
    }

    function _addPurchaseToken(address token) internal {
        if (purchaseTokens[token]) {
            revert AlreadyEnabledError();
        }

        purchaseTokens[token] = true;
    }

    function _removePurchaseToken(address token) internal {
        if (!purchaseTokens[token]) {
            revert AlreadyDisabledError();
        }

        purchaseTokens[token] = false;
    }

    function _setNativeTokenRate(uint256 rate) internal {
        if (rate == 0) {
            revert OnlyPositiveError();
        }

        nativeTokenExchangeRate = rate;
    }

    function _depositToken(
        address token,
        address from,
        uint256 amount
    ) internal {
        IERC20(token).transferFrom(from, address(this), amount);
    }

    function _withdrawToken(
        address token,
        address to,
        uint256 amount
    ) internal {
        IERC20(token).transfer(to, amount);
    }

    function _withdrawNativeToken(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{ value: amount }("");

        require(success);
    }

    function ICOInfo() public view virtual returns (Info memory info) {
        info = icoInfo;
    }

    function _setICOInfo(uint256 supply, uint256 rate) internal virtual {
        if (supply == 0 || rate == 0) {
            revert OnlyPositiveError();
        }

        if (supply <= icoInfo.raised) {
            revert BadSupplyError();
        }

        icoInfo.supply = supply;
        icoInfo.exchangeRate = rate;
    }

    function _setRaised(uint256 raised) internal virtual {
        icoInfo.raised = raised;
    }

    function _receivePurchaseToken(
        address from,
        address purchaseToken,
        uint256 purchaseAmount
    ) internal virtual {
        if (purchaseToken == address(0)) {
            if (msg.value < purchaseAmount) {
                revert InsufficientPurchaseAmount();
            }
        } else {
            _depositToken(purchaseToken, from, purchaseAmount);
        }
    }

    function getQuoteAmount(
        address purchaseToken,
        uint256 purchaseAmount
    ) public view virtual returns (uint256) {
        Info memory info = ICOInfo();
        if (!purchaseTokens[purchaseToken]) {
            revert BadTokenError();
        }

        if (purchaseToken == address(0)) {
            return
                (purchaseAmount * nativeTokenExchangeRate * info.exchangeRate) /
                bpm;
        } else {
            return (purchaseAmount * info.exchangeRate) / bpm;
        }
    }

    function _increaseBought(address account, uint256 amount) internal {
        accountings[account].bought += amount;
    }

    function _buy(
        address purchaseToken,
        address from,
        address to,
        uint256 purchaseAmount
    ) internal virtual {
        uint256 quoteAmount = getQuoteAmount(purchaseToken, purchaseAmount);
        Info memory info = ICOInfo();
        uint256 raised = info.raised + quoteAmount;

        if (info.supply < raised) {
            revert ExceedsSupplyError();
        }

        _setRaised(raised);
        _increaseBought(to, quoteAmount);

        _receivePurchaseToken(from, purchaseToken, purchaseAmount);
    }

    function accountingOf(
        address from
    ) public view returns (Accounting memory accounting) {
        accounting = accountings[from];
    }

    function getClaimable(
        address from
    ) public view virtual returns (uint256 claimable) {
        Accounting memory accounting = accountingOf(from);
        claimable = accounting.bought - accounting.claimed;
    }

    function _increaseClaimed(address account, uint256 amount) internal {
        accountings[account].claimed += amount;
    }

    function _claim(
        address from,
        address to,
        uint256 amountOut
    ) internal virtual {
        if (amountOut == 0) {
            revert OnlyPositiveError();
        }

        uint256 claimable = getClaimable(from);
        if (claimable < amountOut) {
            revert ExceedsClaimableError();
        }

        _increaseClaimed(from, amountOut);

        _withdrawToken(quoteToken, to, amountOut);
    }

    uint256[43] private __gap;
}

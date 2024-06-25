// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {
    Initializable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

import { ICOUpgradable } from "./ICOUpgradable.sol";

contract VestingICOUpgradable is
    Initializable,
    ContextUpgradeable,
    ICOUpgradable
{
    error VestingStartedError();
    error VestingNotStartedError();

    bool public vestingStarted;
    uint256 public vestingStartTime;
    uint256 public vestingMarginDuration;
    uint256 public vestingDuration;
    uint256 public vestingRounds;

    modifier whenVestingStarted() {
        _requireVestingStarted();
        _;
    }

    modifier whenVestingNotStarted() {
        _requireVestingNotStarted();
        _;
    }

    function __VestingICO_init() internal onlyInitializing {
        __VestingICO_init_unchained();
    }

    function __VestingICO_init_unchained() internal onlyInitializing {
        __ICO_init();

        vestingStarted = false;
    }

    function _setVestingMarginDuration(uint256 marginDuration) internal {
        _requireVestingNotStarted();
        if (marginDuration == 0) {
            revert OnlyPositiveError();
        }
        vestingMarginDuration = marginDuration;
    }

    function _setVestingDuration(uint256 duration) internal {
        _requireVestingNotStarted();
        if (duration == 0) {
            revert OnlyPositiveError();
        }
        vestingDuration = duration;
    }

    function _setVestingRounds(uint256 vRounds) internal {
        _requireVestingNotStarted();
        if (vRounds == 0) {
            revert OnlyPositiveError();
        }
        vestingRounds = vRounds;
    }

    function _requireVestingStarted() internal view virtual {
        if (!vestingStarted) {
            revert VestingNotStartedError();
        }
    }

    function _requireVestingNotStarted() internal view virtual {
        if (vestingStarted) {
            revert VestingStartedError();
        }
    }

    function _hardStartVesting() internal {
        _requireVestingNotStarted();
        vestingStarted = true;
        vestingStartTime = block.timestamp;
    }

    function getClaimable(
        address from
    ) public view virtual override returns (uint256 claimable) {
        Accounting memory accounting = accountingOf(from);

        if (!vestingStarted) {
            return 0;
        }

        uint256 marginalStartTime = vestingStartTime + vestingMarginDuration;
        uint256 currentTime = block.timestamp;
        if (currentTime < marginalStartTime) {
            return 0;
        }

        uint256 duration = currentTime - marginalStartTime;
        uint256 portion = duration / vestingDuration;

        if (duration >= vestingDuration * vestingRounds) {
            claimable = accounting.bought - accounting.claimed;
        } else {
            claimable =
                ((accounting.bought * portion) / vestingRounds) -
                accounting.claimed;
        }
    }

    function _claim(
        address from,
        address to,
        uint256 amountOut
    ) internal virtual override {
        _requireVestingStarted();
        super._claim(from, to, amountOut);
    }

    uint256[46] private __gap;
}

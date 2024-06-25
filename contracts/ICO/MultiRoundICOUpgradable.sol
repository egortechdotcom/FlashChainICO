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

contract MultiRoundICOUpgradable is
    Initializable,
    ContextUpgradeable,
    ICOUpgradable
{
    error IncorrectRoundError();

    uint256 public constant rounds = 2;
    uint256 public currentRound;

    Info[rounds] public roundsInfo;

    function __MultiRoundICO_init() internal onlyInitializing {
        __MultiRoundICO_init_unchained();
    }

    function __MultiRoundICO_init_unchained() internal onlyInitializing {
        __ICO_init();

        currentRound = 0;
    }

    function ICOInfo() public view virtual override returns (Info memory info) {
        info = roundsInfo[currentRound];
    }

    function _setICOInfo(
        uint8 round,
        uint256 supply,
        uint256 rate
    ) internal virtual {
        if (round >= rounds) {
            revert IncorrectRoundError();
        }

        if (supply == 0 || rate == 0) {
            revert OnlyPositiveError();
        }

        Info storage roundInfo = roundsInfo[round];

        if (supply <= roundInfo.raised) {
            revert BadSupplyError();
        }

        roundInfo.supply = supply;
        roundInfo.exchangeRate = rate;
    }

    function _setRoundsInfo(
        uint256[rounds] calldata supplies,
        uint256[rounds] calldata rates
    ) internal virtual {
        for (uint8 round = 0; round < rounds; ++round) {
            _setICOInfo(round, supplies[round], rates[round]);
        }
    }

    function _setRaised(uint256 raised) internal virtual override {
        Info memory info = ICOInfo();
        roundsInfo[currentRound].raised = raised;
        if (info.supply == raised) {
            currentRound += 1;
        }
    }

    uint256[19] private __gap;
}

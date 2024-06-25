// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {
    Initializable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    ERC20Upgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {
    OwnableUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {
    ERC20PermitUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

contract Flash is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    ERC20PermitUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) external initializer {
        __ERC20_init("Flash", "FLASH");
        __Ownable_init(initialOwner);
        __ERC20Permit_init("Flash");
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

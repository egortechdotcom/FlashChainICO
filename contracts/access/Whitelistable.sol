// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {
    MerkleProof
} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import {
    Initializable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract Whitelistable is Initializable {
    error InvalidMerkleDataError();
    error NotWhitelistedError();

    bytes32 public merkleRoot;

    function __Whitelistable_init() internal onlyInitializing {
        __Whitelistable_init_unchained();
    }

    function __Whitelistable_init_unchained() internal onlyInitializing {
        merkleRoot = "";
    }

    function _setMerkleRoot(bytes32 root) internal {
        merkleRoot = root;
    }

    function _requireWhitelisted(
        address account,
        bytes32 leaf,
        bytes32[] memory proof
    ) internal view {
        if (keccak256(abi.encodePacked(account)) != leaf) {
            revert InvalidMerkleDataError();
        }

        if (!MerkleProof.verify(proof, merkleRoot, leaf)) {
            revert NotWhitelistedError();
        }
    }

    uint256[49] private __gap;
}

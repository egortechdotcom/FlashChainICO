// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {
    SignatureChecker
} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {
    MessageHashUtils
} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

import {
    Initializable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract Verifiable is Initializable {
    error NotVerifiedError();

    address public signer;
    string expectedCredential;

    function __Verifiable_init() internal onlyInitializing {
        __Verifiable_init_unchained();
    }

    function __Verifiable_init_unchained() internal onlyInitializing {
        signer = 0xacD08d6714ADba531beFF582e6FD5DA1AFD6bc65;
        expectedCredential = "level:plus;citizenship_not:us,cu,ir,kp,sd,sy;residency_not:us,cu,ir,kp,sd,sy";
    }

    function _setSigner(address _signer) internal {
        signer = _signer;
    }

    function _setCredentials(string memory credentials) internal {
        expectedCredential = credentials;
    }

    function _requireVerified(
        address account,
        string memory fractalId,
        uint256 approvedAt,
        uint256 validUntil,
        bytes calldata proof
    ) internal view {
        string memory sender = Strings.toHexString(
            uint256(uint160(account)),
            20
        );

        bool isValid = SignatureChecker.isValidSignatureNow(
            signer,
            MessageHashUtils.toEthSignedMessageHash(
                abi.encodePacked(
                    sender,
                    ";",
                    fractalId,
                    ";",
                    Strings.toString(approvedAt),
                    ";",
                    Strings.toString(validUntil),
                    ";",
                    expectedCredential
                )
            ),
            proof
        );

        if (!isValid) {
            revert NotVerifiedError();
        }
    }

    uint256[48] private __gap;
}

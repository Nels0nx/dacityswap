// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DacityEscrow, IERC20} from "../src/DacityEscrow.sol";

/// @notice Deploys DacityEscrow. Meant for a test network: the contract is unaudited.
///
///   TOKEN=0x… ARBITER=0x… TREASURY=0x… \
///   forge script script/Deploy.s.sol --rpc-url $RPC_URL --account deployer --broadcast
///
/// Optional: BUYER_FEE_BPS (250), SELLER_FEE_BPS (500), ACCEPT_WINDOW (12 hours),
/// DELIVERY_WINDOW (1 day), RELEASE_WINDOW (1 day), DISPUTE_WINDOW (14 days), all in seconds,
/// and OWNER, an address that the deployer offers ownership to.
contract Deploy is Script {
    function run() external returns (DacityEscrow escrow) {
        uint64[4] memory windows = [
            uint64(vm.envOr("ACCEPT_WINDOW", uint256(12 hours))),
            uint64(vm.envOr("DELIVERY_WINDOW", uint256(1 days))),
            uint64(vm.envOr("RELEASE_WINDOW", uint256(1 days))),
            uint64(vm.envOr("DISPUTE_WINDOW", uint256(14 days)))
        ];
        address owner = vm.envOr("OWNER", address(0));

        vm.startBroadcast();
        escrow = new DacityEscrow(
            IERC20(vm.envAddress("TOKEN")),
            vm.envAddress("ARBITER"),
            vm.envAddress("TREASURY"),
            uint16(vm.envOr("BUYER_FEE_BPS", uint256(250))),
            uint16(vm.envOr("SELLER_FEE_BPS", uint256(500))),
            windows
        );
        // Ownership is offered, not given: the new owner has to accept it from its own address.
        if (owner != address(0)) escrow.transferOwnership(owner);
        vm.stopBroadcast();

        console.log("DacityEscrow deployed at", address(escrow));
    }
}

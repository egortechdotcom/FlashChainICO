import { ethers } from "ethers";
import { MerkleTree } from "merkletreejs";

export async function makeMerkleLeafs(whitelisted: string[]) {
    return whitelisted.map((wallet) => ethers.keccak256(wallet));
}

export async function makeMerkleTree(merkleLeafs: string[]) {
    return new MerkleTree(merkleLeafs, ethers.keccak256, {
        sortPairs: true,
    });
}

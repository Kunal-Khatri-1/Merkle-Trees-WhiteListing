const { expect } = require("chai")
const { ethers } = require("hardhat")
const hash = require("keccak256")
const { MerkleTree } = require("merkletreejs")

function encodeLeaf(address, spots) {
    // Same as `abi.encodePacked` in Solidity
    return ethers.utils.defaultAbiCoder.encode(["address", "uint64"], [address, spots])
}

describe("Testing if merkle root is working", () => {
    it("shoud verify address is whitelisted or not", async () => {
        // addresses on which test will work
        const [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners()

        // leaf nodes
        const list = [
            encodeLeaf(owner.address, 2),
            encodeLeaf(addr1.address, 2),
            encodeLeaf(addr2.address, 2),
            encodeLeaf(addr3.address, 2),
            encodeLeaf(addr4.address, 2),
            encodeLeaf(addr5.address, 2),
        ]

        // merkle tree using "hash" => keccak256 hash function
        const merkleTree = new MerkleTree(list, hash, {
            // leaves will be hashed
            hashLeaves: true,
            // hashing pairs will be sorted => for same inputs get same output => deterministic
            sortPairs: true,
        })

        // getting the merkle root
        const MerkleRoot = merkleTree.getHexRoot()

        // Deploying the contract
        const WhiteListFactory = await ethers.getContractFactory("WhiteList")
        const WhiteList = await WhiteListFactory.deploy(MerkleRoot)
        await WhiteList.deployed()

        // Computing Merkle Proof for the owner offchain
        const leaf = hash(list[0])
        const merkleProof = merkleTree.getHexProof(leaf)

        // Calling "checkInWhitelist" function of the smart contract to check if it verifies the merkle proof
        let verified = await WhiteList.checkInWhiteList(merkleProof, 2)
        expect(verified).to.be.equal(true)

        // Calling "checkInWhitelist" function of the smart contract to check if it can verify that this leaf is NOT part of leaf Nodes of Merkle tree
        verified = await WhiteList.checkInWhiteList([], 2)
        expect(verified).to.be.equal(false)
    })
})

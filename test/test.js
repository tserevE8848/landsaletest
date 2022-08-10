const {expect} = require("chai");
const {MerkleTree} = require("merkletreejs")
const keccak256 = require("keccak256")

const {SY_ADDRESS} = require('../holder.js');
const {CLAIMABLE_HOLDER} = require('../claimHolders.js');
function hashToken(address, tokenId) {
    return Buffer.from(ethers.utils.solidityKeccak256(
        ['address','uint256'],
        [address, tokenId]
    ).slice(2), 'hex');
}
describe("YetiLands", function () {
    let yetilands;
    let owner;
    let address1;
    let merkleTree;
    let merkleTreeClaim;
    let rootSYHash;
    let rootSYHashClaim;


    beforeEach(async () => {
        const YetiLandsFactory = await ethers.getContractFactory(
            "YetiLands"
        );
        [owner, address1] = await ethers.getSigners();
        yetilands = await YetiLandsFactory.deploy();
        const leaves = SY_ADDRESS.map(addr => keccak256(addr));
        merkleTree = new MerkleTree(leaves, keccak256, {sortPairs: true});
        rootSYHash = merkleTree.getHexRoot()
        // Claimable
        const leaf = Object.entries(CLAIMABLE_HOLDER).map(token => hashToken(...token));
        merkleTreeClaim = new MerkleTree(leaf, keccak256, {sortPairs: true})
        rootSYHashClaim = merkleTreeClaim.getHexRoot()

        // console.log(rootSYHash);
        const setSaleDetailsTx = await yetilands.setSaleDetails("20", "5", "70000000000000000", "50000000000000000");
        await setSaleDetailsTx.wait();
        // merkleRoot for  claimable
        const setClaimableListTx = await yetilands.setClaimableList(rootSYHashClaim);
        await setClaimableListTx.wait();
        // merkleRoot for  Holder
        const setHolderListTx = await yetilands.setHolderList(rootSYHash);
        await setHolderListTx.wait();

    });

    it("Mint a Holder", async function () {
        const setHolderSaleActive = await yetilands.setHolderSaleActive(1);
        await setHolderSaleActive.wait();
        // added this owner to holder.js
        const holderAddr = owner.address;
        let leaf = keccak256(holderAddr)
        let proof = merkleTree.getHexProof(leaf)
        const sale = await yetilands.sale();
        const result = await yetilands.mintHolder(1,proof, {value: sale.holderPrice});
        await result.wait();

    });
    it("Mint public", async function () {
        const setPublicSaleActive = await yetilands.setPublicSaleActive(1);
        await setPublicSaleActive.wait();
        const mint_amount = 1;
        // added this owner to holder.js
        const holderAddr = owner.address;
        const sale = await yetilands.sale();
        const result = await yetilands.mint(mint_amount, {value: sale.holderPrice});
        await result.wait();

    });
    it("Claim  land", async function () {
        const setClaimLandActive = await yetilands.setClaimLandActive(1);
        await setClaimLandActive.wait();
        // added this owner, how_many_claim as json to claim.js
        const claimAddr = owner.address;
        console.log(claimAddr);
        // everything will be claimed
        const how_many_claim = 2;
        const claimProof = merkleTreeClaim.getHexProof(hashToken(claimAddr.toLowerCase(), how_many_claim));
        const result = await yetilands.claimLand(how_many_claim,claimProof);
        await result.wait();

    });
});

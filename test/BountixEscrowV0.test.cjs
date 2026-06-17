const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_USDC = 1_000_000n; // 1 USDC, 6 decimals = MIN_AMOUNT
const TASK_ID = ethers.id("task-1"); // bytes32

describe("BountixEscrowV0", function () {
  // owner = deployer (also default resolver via deploy script, but here resolver is a separate signer)
  async function deployFixture() {
    const [owner, resolver, payer, worker, outsider] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const Escrow = await ethers.getContractFactory("BountixEscrowV0");
    const escrow = await Escrow.deploy(await usdc.getAddress(), resolver.address);
    await escrow.waitForDeployment();

    // Fund the payer with USDC and approve the escrow.
    await usdc.mint(payer.address, 1000n * ONE_USDC);
    await usdc.connect(payer).approve(await escrow.getAddress(), 1000n * ONE_USDC);

    return { escrow, usdc, owner, resolver, payer, worker, outsider };
  }

  // Helper: fund a standard escrow as `payer`.
  async function fund(escrow, payer, amount = ONE_USDC, taskId = TASK_ID) {
    return escrow.connect(payer).fundEscrow(taskId, amount);
  }

  describe("deployment", function () {
    it("sets usdc, resolver, owner, and MIN_AMOUNT", async function () {
      const { escrow, usdc, owner, resolver } = await loadFixture(deployFixture);
      expect(await escrow.usdc()).to.equal(await usdc.getAddress());
      expect(await escrow.resolver()).to.equal(resolver.address);
      expect(await escrow.owner()).to.equal(owner.address);
      expect(await escrow.MIN_AMOUNT()).to.equal(ONE_USDC);
    });

    it("rejects zero usdc/resolver in constructor", async function () {
      const { resolver, usdc } = await loadFixture(deployFixture);
      const Escrow = await ethers.getContractFactory("BountixEscrowV0");
      await expect(Escrow.deploy(ethers.ZeroAddress, resolver.address)).to.be.revertedWith("Invalid USDC address");
      await expect(Escrow.deploy(await usdc.getAddress(), ethers.ZeroAddress)).to.be.revertedWith("Invalid resolver address");
    });
  });

  describe("fundEscrow", function () {
    it("rejects deposits below 1 USDC", async function () {
      const { escrow, payer } = await loadFixture(deployFixture);
      await expect(fund(escrow, payer, ONE_USDC - 1n)).to.be.revertedWith("Amount below minimum (1 USDC)");
    });

    it("accepts a deposit of exactly 1 USDC and holds the funds", async function () {
      const { escrow, usdc, payer } = await loadFixture(deployFixture);
      await expect(fund(escrow, payer, ONE_USDC))
        .to.emit(escrow, "EscrowFunded")
        .withArgs(TASK_ID, payer.address, ONE_USDC);

      const e = await escrow.getEscrow(TASK_ID);
      expect(e.payer).to.equal(payer.address);
      expect(e.worker).to.equal(ethers.ZeroAddress);
      expect(e.amount).to.equal(ONE_USDC);
      expect(e.state).to.equal(1); // Funded
      expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(ONE_USDC);
    });

    it("rejects funding an already-existing escrow", async function () {
      const { escrow, payer } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await expect(fund(escrow, payer)).to.be.revertedWith("Escrow already exists");
    });
  });

  describe("assignWorker", function () {
    it("lets owner and resolver assign the worker", async function () {
      const { escrow, owner, resolver, payer, worker } = await loadFixture(deployFixture);
      await fund(escrow, payer);

      await expect(escrow.connect(owner).assignWorker(TASK_ID, worker.address))
        .to.emit(escrow, "WorkerAssigned")
        .withArgs(TASK_ID, worker.address);
      expect((await escrow.getEscrow(TASK_ID)).worker).to.equal(worker.address);

      // resolver can reassign while still Funded
      await expect(escrow.connect(resolver).assignWorker(TASK_ID, owner.address))
        .to.emit(escrow, "WorkerAssigned");
    });

    it("reverts for non-admin and for zero address", async function () {
      const { escrow, payer, worker, outsider } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await expect(escrow.connect(outsider).assignWorker(TASK_ID, worker.address)).to.be.revertedWith("Not authorized");
      await expect(escrow.connect(payer).assignWorker(TASK_ID, worker.address)).to.be.revertedWith("Not authorized");
    });

    it("rejects assignment on a non-funded escrow", async function () {
      const { escrow, owner, worker } = await loadFixture(deployFixture);
      await expect(escrow.connect(owner).assignWorker(TASK_ID, worker.address)).to.be.revertedWith("Escrow not funded");
    });

    it("rejects zero-address worker", async function () {
      const { escrow, owner, payer } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await expect(escrow.connect(owner).assignWorker(TASK_ID, ethers.ZeroAddress)).to.be.revertedWith("Invalid worker address");
    });
  });

  describe("releaseEscrow", function () {
    it("pays the assigned worker (admin only)", async function () {
      const { escrow, usdc, resolver, payer, worker } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await escrow.connect(resolver).assignWorker(TASK_ID, worker.address);

      await expect(escrow.connect(resolver).releaseEscrow(TASK_ID))
        .to.emit(escrow, "EscrowReleased")
        .withArgs(TASK_ID, worker.address, ONE_USDC);

      expect(await usdc.balanceOf(worker.address)).to.equal(ONE_USDC);
      expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0n);
      expect((await escrow.getEscrow(TASK_ID)).state).to.equal(2); // Released
    });

    it("reverts if no worker assigned", async function () {
      const { escrow, owner, payer } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await expect(escrow.connect(owner).releaseEscrow(TASK_ID)).to.be.revertedWith("Worker not assigned");
    });

    it("reverts for non-admin", async function () {
      const { escrow, owner, payer, worker, outsider } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);
      await expect(escrow.connect(outsider).releaseEscrow(TASK_ID)).to.be.revertedWith("Not authorized");
      await expect(escrow.connect(payer).releaseEscrow(TASK_ID)).to.be.revertedWith("Not authorized");
    });
  });

  describe("refundEscrow", function () {
    it("returns funds to the payer (admin only)", async function () {
      const { escrow, usdc, owner, payer } = await loadFixture(deployFixture);
      const before = await usdc.balanceOf(payer.address);
      await fund(escrow, payer);
      await expect(escrow.connect(owner).refundEscrow(TASK_ID))
        .to.emit(escrow, "EscrowRefunded")
        .withArgs(TASK_ID, payer.address, ONE_USDC);
      expect(await usdc.balanceOf(payer.address)).to.equal(before);
      expect((await escrow.getEscrow(TASK_ID)).state).to.equal(3); // Refunded
    });

    it("reverts for non-admin", async function () {
      const { escrow, payer, outsider } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await expect(escrow.connect(outsider).refundEscrow(TASK_ID)).to.be.revertedWith("Not authorized");
    });
  });

  describe("double release / refund prevention", function () {
    it("prevents a second release", async function () {
      const { escrow, owner, payer, worker } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);
      await escrow.connect(owner).releaseEscrow(TASK_ID);
      await expect(escrow.connect(owner).releaseEscrow(TASK_ID)).to.be.revertedWith("Escrow not funded");
    });

    it("prevents a second refund", async function () {
      const { escrow, owner, payer } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await escrow.connect(owner).refundEscrow(TASK_ID);
      await expect(escrow.connect(owner).refundEscrow(TASK_ID)).to.be.revertedWith("Escrow not funded");
    });

    it("prevents release after refund (and vice versa)", async function () {
      const { escrow, owner, payer, worker } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);
      await escrow.connect(owner).refundEscrow(TASK_ID);
      await expect(escrow.connect(owner).releaseEscrow(TASK_ID)).to.be.revertedWith("Escrow not funded");
    });
  });

  describe("dispute + resolveDispute", function () {
    it("payer or worker can dispute; outsider cannot", async function () {
      const { escrow, owner, payer, worker, outsider } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);
      await expect(escrow.connect(outsider).disputeEscrow(TASK_ID)).to.be.revertedWith("Not a party");
      await expect(escrow.connect(payer).disputeEscrow(TASK_ID))
        .to.emit(escrow, "EscrowDisputed")
        .withArgs(TASK_ID, payer.address);
      expect((await escrow.getEscrow(TASK_ID)).state).to.equal(4); // Disputed
    });

    it("admin resolves to worker", async function () {
      const { escrow, usdc, owner, resolver, payer, worker } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);
      await escrow.connect(worker).disputeEscrow(TASK_ID);
      await expect(escrow.connect(resolver).resolveDispute(TASK_ID, true))
        .to.emit(escrow, "EscrowResolved")
        .withArgs(TASK_ID, worker.address, ONE_USDC, true);
      expect(await usdc.balanceOf(worker.address)).to.equal(ONE_USDC);
      expect((await escrow.getEscrow(TASK_ID)).state).to.equal(2); // Released
    });

    it("admin resolves to payer (refund)", async function () {
      const { escrow, usdc, owner, payer } = await loadFixture(deployFixture);
      const before = await usdc.balanceOf(payer.address);
      await fund(escrow, payer);
      await escrow.connect(payer).disputeEscrow(TASK_ID);
      await expect(escrow.connect(owner).resolveDispute(TASK_ID, false))
        .to.emit(escrow, "EscrowResolved")
        .withArgs(TASK_ID, payer.address, ONE_USDC, false);
      expect(await usdc.balanceOf(payer.address)).to.equal(before);
      expect((await escrow.getEscrow(TASK_ID)).state).to.equal(3); // Refunded
    });

    it("non-admin cannot resolve, and a non-disputed escrow cannot be resolved", async function () {
      const { escrow, owner, payer, worker, outsider } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);
      await expect(escrow.connect(owner).resolveDispute(TASK_ID, true)).to.be.revertedWith("Escrow not disputed");
      await escrow.connect(payer).disputeEscrow(TASK_ID);
      await expect(escrow.connect(outsider).resolveDispute(TASK_ID, true)).to.be.revertedWith("Not authorized");
    });

    it("cannot release/refund a disputed escrow via normal paths", async function () {
      const { escrow, owner, payer, worker } = await loadFixture(deployFixture);
      await fund(escrow, payer);
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);
      await escrow.connect(payer).disputeEscrow(TASK_ID);
      await expect(escrow.connect(owner).releaseEscrow(TASK_ID)).to.be.revertedWith("Escrow not funded");
      await expect(escrow.connect(owner).refundEscrow(TASK_ID)).to.be.revertedWith("Escrow not funded");
    });
  });

  describe("updateResolver", function () {
    it("owner can update; non-owner cannot; zero rejected", async function () {
      const { escrow, owner, resolver, payer, outsider } = await loadFixture(deployFixture);
      await expect(escrow.connect(owner).updateResolver(payer.address))
        .to.emit(escrow, "ResolverUpdated")
        .withArgs(resolver.address, payer.address);
      expect(await escrow.resolver()).to.equal(payer.address);
      await expect(escrow.connect(outsider).updateResolver(outsider.address))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
      await expect(escrow.connect(owner).updateResolver(ethers.ZeroAddress)).to.be.revertedWith("Invalid resolver address");
    });
  });
});

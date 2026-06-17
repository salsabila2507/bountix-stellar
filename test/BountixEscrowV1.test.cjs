const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_USDC = 1_000_000n;
const DEFAULT_FEE_BPS = 250n;
const MAX_FEE_BPS = 1_000n;
const TASK_ID = ethers.id("v1-task-1");
const RAFFLE_TASK_ID = ethers.id("v1-raffle-1");

function usdc(amount) {
  return BigInt(amount) * ONE_USDC;
}

function feeFor(amount, feeBps = DEFAULT_FEE_BPS) {
  return (amount * feeBps) / 10_000n;
}

describe("BountixEscrowV1", function () {
  async function deployFixture() {
    const [
      owner,
      resolver,
      treasury,
      treasury2,
      payer,
      worker,
      winner1,
      winner2,
      winner3,
      outsider,
    ] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy();
    await token.waitForDeployment();

    const Escrow = await ethers.getContractFactory("BountixEscrowV1");
    const escrow = await Escrow.deploy(
      await token.getAddress(),
      resolver.address,
      treasury.address,
    );
    await escrow.waitForDeployment();

    await token.mint(payer.address, usdc(1000));
    await token.connect(payer).approve(await escrow.getAddress(), usdc(1000));

    return {
      escrow,
      token,
      owner,
      resolver,
      treasury,
      treasury2,
      payer,
      worker,
      winner1,
      winner2,
      winner3,
      outsider,
    };
  }

  async function fundSingle(escrow, payer, amount = usdc(100), taskId = TASK_ID) {
    return escrow.connect(payer).fundEscrow(taskId, amount);
  }

  async function fundRaffle(
    escrow,
    payer,
    amount = usdc(60),
    taskId = RAFFLE_TASK_ID,
  ) {
    return escrow.connect(payer).fundRaffleEscrow(taskId, amount);
  }

  describe("deployment", function () {
    it("sets deployment config", async function () {
      const { escrow, token, owner, resolver, treasury } =
        await loadFixture(deployFixture);

      expect(await escrow.usdc()).to.equal(await token.getAddress());
      expect(await escrow.owner()).to.equal(owner.address);
      expect(await escrow.resolver()).to.equal(resolver.address);
      expect(await escrow.treasury()).to.equal(treasury.address);
      expect(await escrow.feeBps()).to.equal(DEFAULT_FEE_BPS);
      expect(await escrow.MIN_AMOUNT()).to.equal(ONE_USDC);
      expect(await escrow.MAX_FEE_BPS()).to.equal(MAX_FEE_BPS);
      expect(await escrow.DEFAULT_FEE_BPS()).to.equal(DEFAULT_FEE_BPS);
    });

    it("rejects invalid constructor config", async function () {
      const { token, resolver, treasury } = await loadFixture(deployFixture);
      const Escrow = await ethers.getContractFactory("BountixEscrowV1");

      await expect(
        Escrow.deploy(
          ethers.ZeroAddress,
          resolver.address,
          treasury.address,
        ),
      ).to.be.revertedWith("Invalid USDC address");
      await expect(
        Escrow.deploy(
          await token.getAddress(),
          ethers.ZeroAddress,
          treasury.address,
        ),
      ).to.be.revertedWith("Invalid resolver address");
      await expect(
        Escrow.deploy(
          await token.getAddress(),
          resolver.address,
          ethers.ZeroAddress,
        ),
      ).to.be.revertedWith("Invalid treasury address");
    });

    it("rejects native ETH", async function () {
      const { escrow, payer } = await loadFixture(deployFixture);

      await expect(
        payer.sendTransaction({
          to: await escrow.getAddress(),
          value: 1n,
        }),
      ).to.be.revertedWith("No ETH accepted");
    });
  });

  describe("single-worker escrow", function () {
    it("funds a normal escrow", async function () {
      const { escrow, token, payer } = await loadFixture(deployFixture);

      await expect(fundSingle(escrow, payer, usdc(100)))
        .to.emit(escrow, "EscrowFunded")
        .withArgs(TASK_ID, payer.address, usdc(100), 1n);

      const stored = await escrow.getEscrow(TASK_ID);
      expect(stored.payer).to.equal(payer.address);
      expect(stored.worker).to.equal(ethers.ZeroAddress);
      expect(stored.amount).to.equal(usdc(100));
      expect(stored.assignedTotal).to.equal(0n);
      expect(stored.kind).to.equal(1);
      expect(stored.state).to.equal(1);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(usdc(100));
    });

    it("rejects deposits below 1 USDC and duplicate escrows", async function () {
      const { escrow, payer } = await loadFixture(deployFixture);

      await expect(
        escrow.connect(payer).fundEscrow(TASK_ID, ONE_USDC - 1n),
      ).to.be.revertedWith("Amount below minimum (1 USDC)");

      await fundSingle(escrow, payer);
      await expect(fundSingle(escrow, payer)).to.be.revertedWith(
        "Escrow already exists",
      );
    });

    it("assigns a worker", async function () {
      const { escrow, resolver, payer, worker } =
        await loadFixture(deployFixture);
      await fundSingle(escrow, payer);

      await expect(escrow.connect(resolver).assignWorker(TASK_ID, worker.address))
        .to.emit(escrow, "WorkerAssigned")
        .withArgs(TASK_ID, worker.address);

      expect((await escrow.getEscrow(TASK_ID)).worker).to.equal(worker.address);
    });

    it("releases with platform fee", async function () {
      const { escrow, token, resolver, treasury, payer, worker } =
        await loadFixture(deployFixture);
      const grossAmount = usdc(100);
      const feeAmount = feeFor(grossAmount);
      const netAmount = grossAmount - feeAmount;

      await fundSingle(escrow, payer, grossAmount);
      await escrow.connect(resolver).assignWorker(TASK_ID, worker.address);

      await expect(escrow.connect(resolver).releaseEscrow(TASK_ID))
        .to.emit(escrow, "EscrowReleased")
        .withArgs(TASK_ID, worker.address, grossAmount, feeAmount, netAmount);

      expect(await token.balanceOf(treasury.address)).to.equal(feeAmount);
      expect(await token.balanceOf(worker.address)).to.equal(netAmount);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n);
      expect((await escrow.getEscrow(TASK_ID)).state).to.equal(2);
    });

    it("applies the configured max fee cap to a release", async function () {
      const { escrow, token, owner, resolver, treasury, payer, worker } =
        await loadFixture(deployFixture);
      const grossAmount = usdc(123);
      const feeAmount = feeFor(grossAmount, MAX_FEE_BPS);
      const netAmount = grossAmount - feeAmount;

      await escrow.connect(owner).setFeeBps(MAX_FEE_BPS);
      await fundSingle(escrow, payer, grossAmount);
      await escrow.connect(resolver).assignWorker(TASK_ID, worker.address);

      await expect(escrow.connect(resolver).releaseEscrow(TASK_ID))
        .to.emit(escrow, "EscrowReleased")
        .withArgs(TASK_ID, worker.address, grossAmount, feeAmount, netAmount);

      expect(await token.balanceOf(treasury.address)).to.equal(feeAmount);
      expect(await token.balanceOf(worker.address)).to.equal(netAmount);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n);
    });

    it("rounds fee calculations down to USDC base units without stranding funds", async function () {
      const { escrow, token, resolver, treasury, payer, worker } =
        await loadFixture(deployFixture);
      const grossAmount = ONE_USDC + 1n;
      const feeAmount = feeFor(grossAmount);
      const netAmount = grossAmount - feeAmount;

      await fundSingle(escrow, payer, grossAmount);
      await escrow.connect(resolver).assignWorker(TASK_ID, worker.address);
      await escrow.connect(resolver).releaseEscrow(TASK_ID);

      expect(await token.balanceOf(treasury.address)).to.equal(feeAmount);
      expect(await token.balanceOf(worker.address)).to.equal(netAmount);
      expect(feeAmount + netAmount).to.equal(grossAmount);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n);
    });

    it("refunds unreleased escrow to payer", async function () {
      const { escrow, token, owner, payer, worker } =
        await loadFixture(deployFixture);
      const before = await token.balanceOf(payer.address);

      await fundSingle(escrow, payer, usdc(25));
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);

      await expect(escrow.connect(owner).refundEscrow(TASK_ID))
        .to.emit(escrow, "EscrowRefunded")
        .withArgs(TASK_ID, payer.address, usdc(25));

      expect(await token.balanceOf(payer.address)).to.equal(before);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n);
      expect((await escrow.getEscrow(TASK_ID)).state).to.equal(3);
    });

    it("rejects release before assignment", async function () {
      const { escrow, owner, payer } = await loadFixture(deployFixture);
      await fundSingle(escrow, payer);

      await expect(escrow.connect(owner).releaseEscrow(TASK_ID)).to.be.revertedWith(
        "Worker not assigned",
      );
    });

    it("rejects double release", async function () {
      const { escrow, owner, payer, worker } = await loadFixture(deployFixture);
      await fundSingle(escrow, payer);
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);
      await escrow.connect(owner).releaseEscrow(TASK_ID);

      await expect(escrow.connect(owner).releaseEscrow(TASK_ID)).to.be.revertedWith(
        "Escrow not funded",
      );
    });
  });

  describe("configuration", function () {
    it("sets treasury", async function () {
      const { escrow, owner, treasury, treasury2 } =
        await loadFixture(deployFixture);

      await expect(escrow.connect(owner).setTreasury(treasury2.address))
        .to.emit(escrow, "TreasuryUpdated")
        .withArgs(treasury.address, treasury2.address);

      expect(await escrow.treasury()).to.equal(treasury2.address);
    });

    it("sets feeBps and rejects fees above max", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);

      await expect(escrow.connect(owner).setFeeBps(MAX_FEE_BPS))
        .to.emit(escrow, "FeeUpdated")
        .withArgs(DEFAULT_FEE_BPS, MAX_FEE_BPS);
      expect(await escrow.feeBps()).to.equal(MAX_FEE_BPS);

      await expect(escrow.connect(owner).setFeeBps(MAX_FEE_BPS + 1n))
        .to.be.revertedWith("Fee exceeds max");
    });

    it("keeps fee and treasury configuration owner-only", async function () {
      const { escrow, resolver, treasury2 } = await loadFixture(deployFixture);

      await expect(escrow.connect(resolver).setFeeBps(0n))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount")
        .withArgs(resolver.address);
      await expect(escrow.connect(resolver).setTreasury(treasury2.address))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount")
        .withArgs(resolver.address);
    });

    it("rejects zero treasury", async function () {
      const { escrow, owner } = await loadFixture(deployFixture);
      await expect(
        escrow.connect(owner).setTreasury(ethers.ZeroAddress),
      ).to.be.revertedWith("Invalid treasury address");
    });

    it("owner can update resolver", async function () {
      const { escrow, owner, resolver, outsider } =
        await loadFixture(deployFixture);

      await expect(escrow.connect(owner).updateResolver(outsider.address))
        .to.emit(escrow, "ResolverUpdated")
        .withArgs(resolver.address, outsider.address);
      expect(await escrow.resolver()).to.equal(outsider.address);
    });
  });

  describe("raffle escrow", function () {
    it("pays multiple winners net of fee and sends total fee to treasury", async function () {
      const {
        escrow,
        token,
        resolver,
        treasury,
        payer,
        winner1,
        winner2,
        winner3,
      } = await loadFixture(deployFixture);
      const winners = [winner1.address, winner2.address, winner3.address];
      const payouts = [usdc(10), usdc(20), usdc(30)];
      const fees = payouts.map((amount) => feeFor(amount));
      const nets = payouts.map((amount, index) => amount - fees[index]);
      const totalFee = fees.reduce((total, amount) => total + amount, 0n);
      const totalNet = nets.reduce((total, amount) => total + amount, 0n);

      await expect(fundRaffle(escrow, payer, usdc(60)))
        .to.emit(escrow, "EscrowFunded")
        .withArgs(RAFFLE_TASK_ID, payer.address, usdc(60), 2n);

      await expect(
        escrow.connect(resolver).assignRaffleWinners(
          RAFFLE_TASK_ID,
          winners,
          payouts,
        ),
      )
        .to.emit(escrow, "RaffleWinnersAssigned")
        .withArgs(RAFFLE_TASK_ID, winners, payouts);

      await expect(escrow.connect(resolver).releaseRaffleEscrow(RAFFLE_TASK_ID))
        .to.emit(escrow, "RaffleEscrowReleased")
        .withArgs(RAFFLE_TASK_ID, usdc(60), totalFee, totalNet, 3n);

      expect(await token.balanceOf(winner1.address)).to.equal(nets[0]);
      expect(await token.balanceOf(winner2.address)).to.equal(nets[1]);
      expect(await token.balanceOf(winner3.address)).to.equal(nets[2]);
      expect(await token.balanceOf(treasury.address)).to.equal(totalFee);
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(0n);
      expect((await escrow.getEscrow(RAFFLE_TASK_ID)).state).to.equal(2);

      const storedPayouts = await escrow.getRafflePayouts(RAFFLE_TASK_ID);
      expect(storedPayouts).to.have.length(3);
      expect(storedPayouts[0].winner).to.equal(winner1.address);
      expect(storedPayouts[0].grossAmount).to.equal(usdc(10));
    });

    it("rejects invalid winner and payout arrays", async function () {
      const { escrow, owner, payer, winner1, winner2 } =
        await loadFixture(deployFixture);
      await fundRaffle(escrow, payer, usdc(30));

      await expect(
        escrow.connect(owner).assignRaffleWinners(RAFFLE_TASK_ID, [], []),
      ).to.be.revertedWith("No winners");
      await expect(
        escrow.connect(owner).assignRaffleWinners(
          RAFFLE_TASK_ID,
          [winner1.address],
          [usdc(10), usdc(20)],
        ),
      ).to.be.revertedWith("Array length mismatch");
      await expect(
        escrow.connect(owner).assignRaffleWinners(
          RAFFLE_TASK_ID,
          [ethers.ZeroAddress],
          [usdc(30)],
        ),
      ).to.be.revertedWith("Invalid winner address");
      await expect(
        escrow.connect(owner).assignRaffleWinners(
          RAFFLE_TASK_ID,
          [winner1.address],
          [0n],
        ),
      ).to.be.revertedWith("Invalid payout amount");
      await expect(
        escrow.connect(owner).assignRaffleWinners(
          RAFFLE_TASK_ID,
          [winner1.address, winner2.address],
          [usdc(10), usdc(10)],
        ),
      ).to.be.revertedWith("Payout total mismatch");
    });

    it("rejects raffle release before winners are assigned", async function () {
      const { escrow, owner, payer } = await loadFixture(deployFixture);
      await fundRaffle(escrow, payer);

      await expect(
        escrow.connect(owner).releaseRaffleEscrow(RAFFLE_TASK_ID),
      ).to.be.revertedWith("Raffle winners not assigned");
    });

    it("rejects double raffle release", async function () {
      const { escrow, owner, payer, winner1, winner2 } =
        await loadFixture(deployFixture);
      await fundRaffle(escrow, payer, usdc(30));
      await escrow.connect(owner).assignRaffleWinners(
        RAFFLE_TASK_ID,
        [winner1.address, winner2.address],
        [usdc(10), usdc(20)],
      );
      await escrow.connect(owner).releaseRaffleEscrow(RAFFLE_TASK_ID);

      await expect(
        escrow.connect(owner).releaseRaffleEscrow(RAFFLE_TASK_ID),
      ).to.be.revertedWith("Escrow not funded");
    });

    it("does not allow single-worker assignment on a raffle escrow", async function () {
      const { escrow, owner, payer, worker } = await loadFixture(deployFixture);
      await fundRaffle(escrow, payer);

      await expect(
        escrow.connect(owner).assignWorker(RAFFLE_TASK_ID, worker.address),
      ).to.be.revertedWith("Not single escrow");
    });
  });

  describe("access guards", function () {
    it("rejects unauthorized actions", async function () {
      const { escrow, owner, payer, worker, winner1, outsider, treasury2 } =
        await loadFixture(deployFixture);
      await fundSingle(escrow, payer);

      await expect(
        escrow.connect(outsider).assignWorker(TASK_ID, worker.address),
      ).to.be.revertedWith("Not authorized");
      await escrow.connect(owner).assignWorker(TASK_ID, worker.address);
      await expect(escrow.connect(outsider).releaseEscrow(TASK_ID))
        .to.be.revertedWith("Not authorized");
      await expect(escrow.connect(outsider).refundEscrow(TASK_ID))
        .to.be.revertedWith("Not authorized");
      await expect(escrow.connect(outsider).setTreasury(treasury2.address))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount")
        .withArgs(outsider.address);
      await expect(escrow.connect(outsider).setFeeBps(0n))
        .to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount")
        .withArgs(outsider.address);

      const raffleTaskId = ethers.id("non-admin-raffle");
      await fundRaffle(escrow, payer, usdc(10), raffleTaskId);
      await expect(
        escrow.connect(outsider).assignRaffleWinners(
          raffleTaskId,
          [winner1.address],
          [usdc(10)],
        ),
      ).to.be.revertedWith("Not authorized");
      await escrow.connect(owner).assignRaffleWinners(
        raffleTaskId,
        [winner1.address],
        [usdc(10)],
      );
      await expect(escrow.connect(outsider).releaseRaffleEscrow(raffleTaskId))
        .to.be.revertedWith("Not authorized");
    });
  });
});

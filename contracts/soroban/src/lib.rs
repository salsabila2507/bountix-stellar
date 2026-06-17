#![no_std]

mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, token::TokenClient, Address, BytesN, Env, Vec,
};

pub const MIN_AMOUNT: i128 = 10_000_000;
pub const BPS_DENOMINATOR: i128 = 10_000;
pub const MAX_FEE_BPS: i128 = 1_000;
pub const DEFAULT_FEE_BPS: i128 = 250;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowState {
    None,
    Funded,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowKind {
    None,
    Single,
    Raffle,
}

#[contracttype]
#[derive(Clone)]
pub struct Escrow {
    pub payer: Address,
    pub worker: Address,
    pub amount: i128,
    pub assigned_total: i128,
    pub kind: EscrowKind,
    pub state: EscrowState,
}

#[contracttype]
#[derive(Clone)]
pub struct RafflePayout {
    pub winner: Address,
    pub gross_amount: i128,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Treasury,
    Usdc,
    FeeBps,
    Escrow(BytesN<32>),
    RafflePayouts(BytesN<32>),
}

#[contract]
pub struct BountixEscrow;

#[contractimpl]
impl BountixEscrow {
    /// Initialize the contract with admin, treasury, and USDC address.
    pub fn initialize(env: Env, admin: Address, treasury: Address, usdc: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage().instance().set(&DataKey::Usdc, &usdc);
        env.storage()
            .instance()
            .set(&DataKey::FeeBps, &DEFAULT_FEE_BPS);
    }

    /// Set the admin (resolver) address.
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    /// Set the treasury address.
    pub fn set_treasury(env: Env, new_treasury: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Treasury, &new_treasury);
    }

    /// Set the platform fee in basis points. Max 10%.
    pub fn set_fee_bps(env: Env, new_fee_bps: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        if new_fee_bps > MAX_FEE_BPS {
            panic!("fee exceeds max");
        }
        env.storage().instance().set(&DataKey::FeeBps, &new_fee_bps);
    }

    // -----------------------------------------------------------------------
    // Fund
    // -----------------------------------------------------------------------

    /// Fund a single-worker escrow. Payer must approve USDC first.
    pub fn fund_escrow(env: Env, payer: Address, task_id: BytesN<32>, amount: i128) {
        payer.require_auth();
        if amount < MIN_AMOUNT {
            panic!("amount below minimum");
        }
        let key = DataKey::Escrow(task_id.clone());
        if env.storage().instance().has(&key) {
            panic!("escrow already exists");
        }

        let escrow = Escrow {
            payer: payer.clone(),
            worker: env.current_contract_address(),
            amount,
            assigned_total: 0,
            kind: EscrowKind::Single,
            state: EscrowState::Funded,
        };
        env.storage().instance().set(&key, &escrow);

        let usdc: Address = env.storage().instance().get(&DataKey::Usdc).expect("not initialized");
        let token = TokenClient::new(&env, &usdc);
        token.transfer(&payer, &env.current_contract_address(), &amount);
    }

    /// Fund a raffle escrow (multiple winners).
    pub fn fund_raffle_escrow(env: Env, payer: Address, task_id: BytesN<32>, amount: i128) {
        payer.require_auth();
        if amount < MIN_AMOUNT {
            panic!("amount below minimum");
        }
        let key = DataKey::Escrow(task_id.clone());
        if env.storage().instance().has(&key) {
            panic!("escrow already exists");
        }

        let escrow = Escrow {
            payer: payer.clone(),
            worker: env.current_contract_address(),
            amount,
            assigned_total: 0,
            kind: EscrowKind::Raffle,
            state: EscrowState::Funded,
        };
        env.storage().instance().set(&key, &escrow);

        let usdc: Address = env.storage().instance().get(&DataKey::Usdc).expect("not initialized");
        let token = TokenClient::new(&env, &usdc);
        token.transfer(&payer, &env.current_contract_address(), &amount);
    }

    // -----------------------------------------------------------------------
    // Assign
    // -----------------------------------------------------------------------

    /// Assign a worker for a single escrow. Admin only.
    pub fn assign_worker(env: Env, task_id: BytesN<32>, worker: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();

        let key = DataKey::Escrow(task_id.clone());
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("escrow not found");
        if escrow.state != EscrowState::Funded {
            panic!("escrow not funded");
        }
        if escrow.kind != EscrowKind::Single {
            panic!("not single escrow");
        }
        escrow.worker = worker;
        env.storage().instance().set(&key, &escrow);
    }

    /// Assign raffle winners. Admin only.
    pub fn assign_raffle_winners(
        env: Env,
        task_id: BytesN<32>,
        winners: Vec<Address>,
        gross_amounts: Vec<i128>,
    ) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();

        let key = DataKey::Escrow(task_id.clone());
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("escrow not found");
        if escrow.state != EscrowState::Funded {
            panic!("escrow not funded");
        }
        if escrow.kind != EscrowKind::Raffle {
            panic!("not raffle escrow");
        }
        if winners.len() == 0 {
            panic!("no winners");
        }
        if winners.len() != gross_amounts.len() {
            panic!("array length mismatch");
        }

        let mut payouts = Vec::new(&env);
        let mut total: i128 = 0;
        for i in 0..winners.len() {
            let gross = gross_amounts.get(i).unwrap();
            if gross <= 0 {
                panic!("invalid payout amount");
            }
            total += gross;
            payouts.push_back(RafflePayout {
                winner: winners.get(i).unwrap(),
                gross_amount: gross,
            });
        }
        if total != escrow.amount {
            panic!("payout total mismatch");
        }

        escrow.assigned_total = total;
        env.storage().instance().set(&key, &escrow);
        env.storage().instance().set(&DataKey::RafflePayouts(task_id.clone()), &payouts);
    }

    // -----------------------------------------------------------------------
    // Release
    // -----------------------------------------------------------------------

    /// Release a single escrow to the assigned worker. Admin only.
    pub fn release_escrow(env: Env, task_id: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();

        let key = DataKey::Escrow(task_id.clone());
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("escrow not found");
        if escrow.state != EscrowState::Funded {
            panic!("escrow not funded");
        }
        if escrow.kind != EscrowKind::Single {
            panic!("not single escrow");
        }

        escrow.state = EscrowState::Released;
        env.storage().instance().set(&key, &escrow);

        let fee_bps: i128 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(DEFAULT_FEE_BPS);
        let fee = (escrow.amount * fee_bps) / BPS_DENOMINATOR;
        let net = escrow.amount - fee;

        let usdc: Address = env.storage().instance().get(&DataKey::Usdc).expect("not initialized");
        let token = TokenClient::new(&env, &usdc);
        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).expect("not initialized");

        if fee > 0 {
            token.transfer(&env.current_contract_address(), &treasury, &fee);
        }
        token.transfer(&env.current_contract_address(), &escrow.worker, &net);
    }

    /// Release a raffle escrow to all winners. Admin only.
    pub fn release_raffle_escrow(env: Env, task_id: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();

        let key = DataKey::Escrow(task_id.clone());
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("escrow not found");
        if escrow.state != EscrowState::Funded {
            panic!("escrow not funded");
        }
        if escrow.kind != EscrowKind::Raffle {
            panic!("not raffle escrow");
        }

        let payouts: Vec<RafflePayout> = env.storage().instance()
            .get(&DataKey::RafflePayouts(task_id.clone()))
            .expect("raffle winners not assigned");

        escrow.state = EscrowState::Released;
        env.storage().instance().set(&key, &escrow);

        let fee_bps: i128 = env.storage().instance().get(&DataKey::FeeBps).unwrap_or(DEFAULT_FEE_BPS);
        let usdc: Address = env.storage().instance().get(&DataKey::Usdc).expect("not initialized");
        let token = TokenClient::new(&env, &usdc);
        let treasury: Address = env.storage().instance().get(&DataKey::Treasury).expect("not initialized");

        let mut total_fee: i128 = 0;
        for payout in payouts.iter() {
            let fee = (payout.gross_amount * fee_bps) / BPS_DENOMINATOR;
            let net = payout.gross_amount - fee;
            total_fee += fee;
            token.transfer(&env.current_contract_address(), &payout.winner, &net);
        }
        if total_fee > 0 {
            token.transfer(&env.current_contract_address(), &treasury, &total_fee);
        }
    }

    // -----------------------------------------------------------------------
    // Refund
    // -----------------------------------------------------------------------

    /// Refund the full escrow amount to the payer. Admin only.
    pub fn refund_escrow(env: Env, task_id: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();

        let key = DataKey::Escrow(task_id.clone());
        let mut escrow: Escrow = env.storage().instance().get(&key).expect("escrow not found");
        if escrow.state != EscrowState::Funded {
            panic!("escrow not funded");
        }

        escrow.state = EscrowState::Refunded;
        env.storage().instance().set(&key, &escrow);

        let usdc: Address = env.storage().instance().get(&DataKey::Usdc).expect("not initialized");
        let token = TokenClient::new(&env, &usdc);
        token.transfer(&env.current_contract_address(), &escrow.payer, &escrow.amount);
    }

    // -----------------------------------------------------------------------
    // View
    // -----------------------------------------------------------------------

    pub fn get_escrow(env: Env, task_id: BytesN<32>) -> Escrow {
        env.storage().instance().get(&DataKey::Escrow(task_id)).expect("escrow not found")
    }

    pub fn get_raffle_payouts(env: Env, task_id: BytesN<32>) -> Vec<RafflePayout> {
        env.storage().instance().get(&DataKey::RafflePayouts(task_id)).unwrap_or(Vec::new(&env))
    }

    pub fn get_fee_bps(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::FeeBps).unwrap_or(DEFAULT_FEE_BPS)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).expect("not initialized")
    }

    pub fn get_treasury(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Treasury).expect("not initialized")
    }

    pub fn get_usdc(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Usdc).expect("not initialized")
    }
}

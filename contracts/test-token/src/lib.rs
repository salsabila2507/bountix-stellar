#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, log, Address, BytesN, Env, String, Vec,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Balance(Address),
    Admin,
    Name,
    Symbol,
    Decimals,
}

#[contract]
pub struct TestToken;

#[contractimpl]
impl TestToken {
    pub fn initialize(e: Env, admin: Address, name: String, symbol: String) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Name, &name);
        e.storage().instance().set(&DataKey::Symbol, &symbol);
        e.storage().instance().set(&DataKey::Decimals, &7u32);
    }

    pub fn mint(e: Env, to: Address, amount: i128) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).expect("not initialized");
        admin.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let key = DataKey::Balance(to.clone());
        let bal: i128 = e.storage().instance().get(&key).unwrap_or(0);
        e.storage().instance().set(&key, &(bal + amount));
    }

    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }
        let from_key = DataKey::Balance(from.clone());
        let from_bal: i128 = e.storage().instance().get(&from_key).unwrap_or(0);
        if from_bal < amount {
            panic!("insufficient balance");
        }
        e.storage().instance().set(&from_key, &(from_bal - amount));

        let to_key = DataKey::Balance(to.clone());
        let to_bal: i128 = e.storage().instance().get(&to_key).unwrap_or(0);
        e.storage().instance().set(&to_key, &(to_bal + amount));
    }

    pub fn balance(e: Env, id: Address) -> i128 {
        e.storage()
            .instance()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    pub fn name(e: Env) -> String {
        e.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(e: Env) -> String {
        e.storage().instance().get(&DataKey::Symbol).unwrap()
    }

    pub fn decimals(e: Env) -> u32 {
        e.storage().instance().get(&DataKey::Decimals).unwrap()
    }
}

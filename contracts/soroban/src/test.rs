#![cfg(test)]

use super::*;
use soroban_sdk::Env;

#[test]
fn test_initialize() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let usdc = Address::generate(&env);

    let contract_id = env.register(BountixEscrow, (admin.clone(),));
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc);

    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_treasury(), treasury);
    assert_eq!(client.get_usdc(), usdc);
    assert_eq!(client.get_fee_bps(), DEFAULT_FEE_BPS);
}

#[test]
fn test_set_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let new_admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let usdc = Address::generate(&env);

    let contract_id = env.register(BountixEscrow, (admin.clone(),));
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc);
    client.set_admin(&new_admin);

    assert_eq!(client.get_admin(), new_admin);
}

#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::StellarAssetClient;

fn register_token(env: &Env, issuer: &soroban_sdk::Address) -> soroban_sdk::Address {
    let token_scval = env.register_stellar_asset_contract_v2(issuer.clone());
    token_scval.address()
}

#[test]
fn test_initialize() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);
    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_treasury(), treasury);
    assert_eq!(client.get_usdc(), usdc);
    assert_eq!(client.get_usdt(), usdt);
    assert_eq!(client.get_fee_bps(), DEFAULT_FEE_BPS);
}

#[test]
fn test_set_usdc_and_usdt() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);
    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let new_usdc = register_token(&env, &issuer);
    let new_usdt = register_token(&env, &issuer);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    client.set_usdc(&new_usdc);
    client.set_usdt(&new_usdt);

    assert_eq!(client.get_usdc(), new_usdc);
    assert_eq!(client.get_usdt(), new_usdt);
}

#[test]
fn test_fund_release_single_usdc() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let payer = soroban_sdk::Address::generate(&env);
    let worker = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);

    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let usdc_client = StellarAssetClient::new(&env, &usdc);
    usdc_client.mint(&payer, &1_000_000_000);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    let task_id = BytesN::from_array(&env, &[0u8; 32]);

    client.fund_escrow(&payer, &task_id, &500_000_000, &usdc);

    let escrow = client.get_escrow(&task_id);
    assert_eq!(escrow.payer, payer);
    assert_eq!(escrow.amount, 500_000_000);
    assert_eq!(escrow.kind, EscrowKind::Single);
    assert_eq!(escrow.state, EscrowState::Funded);
    assert_eq!(escrow.token, usdc);

    client.assign_worker(&task_id, &worker);
    client.release_escrow(&task_id);

    let escrow = client.get_escrow(&task_id);
    assert_eq!(escrow.state, EscrowState::Released);

    // Fee: 500M * 250 / 10000 = 12.5M; Net: 487.5M
    let treasury_balance = usdc_client.balance(&treasury);
    let worker_balance = usdc_client.balance(&worker);
    assert_eq!(treasury_balance, 12_500_000);
    assert_eq!(worker_balance, 487_500_000);
}

#[test]
fn test_fund_release_single_usdt() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let payer = soroban_sdk::Address::generate(&env);
    let worker = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);

    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let usdt_client = StellarAssetClient::new(&env, &usdt);
    usdt_client.mint(&payer, &1_000_000_000);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    let task_id = BytesN::from_array(&env, &[1u8; 32]);

    client.fund_escrow(&payer, &task_id, &300_000_000, &usdt);

    let escrow = client.get_escrow(&task_id);
    assert_eq!(escrow.token, usdt);

    client.assign_worker(&task_id, &worker);
    client.release_escrow(&task_id);

    let escrow = client.get_escrow(&task_id);
    assert_eq!(escrow.state, EscrowState::Released);

    // Fee: 300M * 250 / 10000 = 7.5M; Net: 292.5M
    let treasury_balance = usdt_client.balance(&treasury);
    let worker_balance = usdt_client.balance(&worker);
    assert_eq!(treasury_balance, 7_500_000);
    assert_eq!(worker_balance, 292_500_000);
}

#[test]
fn test_fund_refund() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let payer = soroban_sdk::Address::generate(&env);
    let worker = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);

    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let usdc_client = StellarAssetClient::new(&env, &usdc);
    usdc_client.mint(&payer, &1_000_000_000);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    let task_id = BytesN::from_array(&env, &[2u8; 32]);

    client.fund_escrow(&payer, &task_id, &400_000_000, &usdc);
    client.assign_worker(&task_id, &worker);
    client.refund_escrow(&task_id);

    let escrow = client.get_escrow(&task_id);
    assert_eq!(escrow.state, EscrowState::Refunded);

    // Full amount returned to payer
    let payer_balance = usdc_client.balance(&payer);
    assert_eq!(payer_balance, 1_000_000_000);

    assert_eq!(usdc_client.balance(&treasury), 0);
    assert_eq!(usdc_client.balance(&worker), 0);
}

#[test]
fn test_fund_release_raffle() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let payer = soroban_sdk::Address::generate(&env);
    let winner1 = soroban_sdk::Address::generate(&env);
    let winner2 = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);

    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let usdc_client = StellarAssetClient::new(&env, &usdc);
    usdc_client.mint(&payer, &1_000_000_000);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    let task_id = BytesN::from_array(&env, &[3u8; 32]);

    client.fund_raffle_escrow(&payer, &task_id, &1_000_000_000, &usdc);

    let escrow = client.get_escrow(&task_id);
    assert_eq!(escrow.payer, payer);
    assert_eq!(escrow.amount, 1_000_000_000);
    assert_eq!(escrow.kind, EscrowKind::Raffle);
    assert_eq!(escrow.state, EscrowState::Funded);
    assert_eq!(escrow.token, usdc);

    let winners = Vec::from_array(&env, [winner1.clone(), winner2.clone()]);
    let gross_amounts = Vec::from_array(&env, [400_000_000i128, 600_000_000i128]);
    client.assign_raffle_winners(&task_id, &winners, &gross_amounts);

    client.release_raffle_escrow(&task_id);

    let escrow = client.get_escrow(&task_id);
    assert_eq!(escrow.state, EscrowState::Released);

    // Winner1: 400M - 10M = 390M; Winner2: 600M - 15M = 585M; Fee: 25M
    assert_eq!(usdc_client.balance(&winner1), 390_000_000);
    assert_eq!(usdc_client.balance(&winner2), 585_000_000);
    assert_eq!(usdc_client.balance(&treasury), 25_000_000);
}

#[test]
#[should_panic(expected = "unsupported token")]
fn test_fund_with_invalid_token_reverts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let payer = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);

    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);
    let invalid_token = soroban_sdk::Address::generate(&env);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    let task_id = BytesN::from_array(&env, &[4u8; 32]);
    client.fund_escrow(&payer, &task_id, &100_000_000, &invalid_token);
}

#[test]
#[should_panic(expected = "escrow not funded")]
fn test_double_release_reverts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let payer = soroban_sdk::Address::generate(&env);
    let worker = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);

    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let usdc_client = StellarAssetClient::new(&env, &usdc);
    usdc_client.mint(&payer, &1_000_000_000);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    let task_id = BytesN::from_array(&env, &[5u8; 32]);
    client.fund_escrow(&payer, &task_id, &500_000_000, &usdc);
    client.assign_worker(&task_id, &worker);
    client.release_escrow(&task_id);
    // Second release should panic
    client.release_escrow(&task_id);
}

#[test]
#[should_panic(expected = "worker not assigned")]
fn test_release_without_assign_worker_reverts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let payer = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);

    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let usdc_client = StellarAssetClient::new(&env, &usdc);
    usdc_client.mint(&payer, &1_000_000_000);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    let task_id = BytesN::from_array(&env, &[6u8; 32]);
    client.fund_escrow(&payer, &task_id, &500_000_000, &usdc);
    // Release without calling assign_worker first - should panic
    client.release_escrow(&task_id);
}

#[test]
#[should_panic(expected = "not single escrow")]
fn test_assign_worker_to_raffle_reverts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let payer = soroban_sdk::Address::generate(&env);
    let worker = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);

    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let usdc_client = StellarAssetClient::new(&env, &usdc);
    usdc_client.mint(&payer, &1_000_000_000);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    let task_id = BytesN::from_array(&env, &[7u8; 32]);
    // Create a raffle escrow
    client.fund_raffle_escrow(&payer, &task_id, &1_000_000_000, &usdc);
    // Try to assign a worker to a raffle escrow - should panic
    client.assign_worker(&task_id, &worker);
}

#[test]
#[should_panic(expected = "fee exceeds max")]
fn test_fee_bps_exceeds_max_reverts() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = soroban_sdk::Address::generate(&env);
    let treasury = soroban_sdk::Address::generate(&env);
    let issuer = soroban_sdk::Address::generate(&env);

    let usdc = register_token(&env, &issuer);
    let usdt = register_token(&env, &issuer);

    let contract_id = env.register(BountixEscrow, ());
    let client = BountixEscrowClient::new(&env, &contract_id);

    client.initialize(&admin, &treasury, &usdc, &usdt);

    // Try to set fee_bps to 1001 (exceeds MAX_FEE_BPS of 1000)
    client.set_fee_bps(&1001);
}

import { Asset, Keypair } from "@stellar/stellar-sdk"
import { USDC_CLASSIC_CODE, USDC_CLASSIC_ISSUER } from "@/lib/payments"
import { fetchAccount, friendbotFund, type AccountInfo } from "./horizon"
import {
  buildChangeTrust,
  signTransaction,
  submitTransaction,
} from "./transactions"

export function hasUsdcTrustline(
  account: Pick<AccountInfo, "balances">,
): boolean {
  return account.balances.some(
    (balance) =>
      balance.asset_code === USDC_CLASSIC_CODE &&
      balance.asset_issuer === USDC_CLASSIC_ISSUER,
  )
}

async function loadFundedAccount(publicKey: string): Promise<AccountInfo> {
  try {
    return await fetchAccount(publicKey)
  } catch {
    try {
      await friendbotFund(publicKey)
    } catch {
      // The account may already exist or Friendbot may be temporarily busy.
    }
  }

  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await fetchAccount(publicKey)
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not activate the Stellar account.")
}

export async function ensureUsdcTrustline(secretKey: string): Promise<void> {
  const keypair = Keypair.fromSecret(secretKey)
  const account = await loadFundedAccount(keypair.publicKey())
  if (hasUsdcTrustline(account)) return

  const asset = new Asset(USDC_CLASSIC_CODE, USDC_CLASSIC_ISSUER)
  const transaction = await buildChangeTrust(secretKey, asset)
  const signed = signTransaction(transaction, secretKey)
  await submitTransaction(signed)
}

export async function walletHasUsdcTrustline(
  publicKey: string,
): Promise<boolean> {
  const account = await fetchAccount(publicKey)
  return hasUsdcTrustline(account)
}

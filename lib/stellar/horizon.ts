import {
  Horizon,
  Asset,
} from "@stellar/stellar-sdk"

const HORIZON_URL = "https://horizon-testnet.stellar.org"
const server = new Horizon.Server(HORIZON_URL, { allowHttp: true })

export interface AccountInfo {
  id: string
  sequence: string
  balances: Balance[]
  signers: string[]
}

export interface Balance {
  asset_type: string
  asset_code?: string
  asset_issuer?: string
  balance: string
  limit?: string
  buying_liabilities?: string
  selling_liabilities?: string
}

export interface PaymentRecord {
  id: string
  type: string
  amount: string
  from: string
  to: string
  asset_code?: string
  asset_issuer?: string
  asset_type: string
  memo?: string
  created_at: string
}

export interface Path {
  source_amount: string
  destination_amount: string
  path: { asset_code?: string; asset_issuer?: string; asset_type: string }[]
}

export async function fetchAccount(publicKey: string): Promise<AccountInfo> {
  const account = await server.loadAccount(publicKey)
  return {
    id: account.id,
    sequence: account.sequenceNumber(),
    balances: (account as any).balances as Balance[],
    signers: (account as any).signers?.map((s: any) => s.key) ?? [],
  }
}

export async function fetchBalances(publicKey: string): Promise<Balance[]> {
  const info = await fetchAccount(publicKey)
  return info.balances
}

export async function fetchPayments(
  publicKey: string,
  limit = 50
): Promise<PaymentRecord[]> {
  const payments = await server
    .payments()
    .forAccount(publicKey)
    .limit(limit)
    .order("desc")
    .call()
  return payments.records.map((p: any) => ({
    id: p.id,
    type: p.type,
    amount: p.amount ?? "0",
    from: p.from,
    to: p.to,
    asset_code: p.asset_code,
    asset_issuer: p.asset_issuer,
    asset_type: p.asset_type,
    memo: p.memo,
    created_at: p.created_at,
  }))
}

export async function findStrictSendPaths(
  sourceAsset: Asset,
  sourceAmount: string,
  destinationAssets: Asset[]
): Promise<Path[]> {
  const resp = await server
    .strictSendPaths(sourceAsset, sourceAmount, destinationAssets)
    .call()
  return resp.records.map((r: any) => ({
    source_amount: r.source_amount,
    destination_amount: r.destination_amount,
    path: r.path,
  }))
}

export async function findStrictReceivePaths(
  destinationAsset: Asset,
  destinationAmount: string,
  sourceAssets: Asset[]
): Promise<Path[]> {
  const resp = await server
    .strictReceivePaths(destinationAsset, destinationAmount, sourceAssets)
    .call()
  return resp.records.map((r: any) => ({
    source_amount: r.source_amount,
    destination_amount: r.destination_amount,
    path: r.path,
  }))
}

export function assetFromCode(code: string, issuer?: string): Asset {
  if (!code || code === "XLM") return Asset.native()
  if (!issuer) throw new Error(`Issuer required for asset ${code}`)
  return new Asset(code, issuer)
}

export function friendbotFund(publicKey: string): Promise<Response> {
  return fetch(`https://friendbot.stellar.org?addr=${publicKey}`)
}

import {
  Server,
  BASE_FEE,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
  MemoText,
  MemoId,
  Transaction,
} from "@stellar/stellar-sdk"

export type MemoValue = { type: "none" } | { type: "text"; value: string } | { type: "id"; value: string }

const HORIZON_URL = "https://horizon-testnet.stellar.org"
const server = new Server(HORIZON_URL, { allowHttp: true })

function makeMemo(memo?: MemoValue): Memo | undefined {
  if (!memo || memo.type === "none") return undefined
  if (memo.type === "text") return new MemoText(memo.value)
  if (memo.type === "id") return new MemoId(memo.value)
  return undefined
}

export async function buildPayment(
  sourceSecret: string,
  destination: string,
  amount: string,
  asset?: Asset,
  memo?: MemoValue
): Promise<Transaction> {
  const sourceKp = Keypair.fromSecret(sourceSecret)
  const sourceAcc = await server.loadAccount(sourceKp.publicKey())
  const tx = new TransactionBuilder(sourceAcc, {
    fee: BASE_FEE,
    networkPassphrase: "Test SDF Network ; September 2015",
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: asset ?? Asset.native(),
        amount,
      })
    )
  if (memo) tx.addMemo(makeMemo(memo)!)
  return tx.setTimeout(30).build()
}

export async function buildCreateAccount(
  sourceSecret: string,
  destination: string,
  startingBalance: string
): Promise<Transaction> {
  const sourceKp = Keypair.fromSecret(sourceSecret)
  const sourceAcc = await server.loadAccount(sourceKp.publicKey())
  return new TransactionBuilder(sourceAcc, {
    fee: BASE_FEE,
    networkPassphrase: "Test SDF Network ; September 2015",
  })
    .addOperation(
      Operation.createAccount({
        destination,
        startingBalance,
      })
    )
    .setTimeout(30)
    .build()
}

export async function buildChangeTrust(
  sourceSecret: string,
  asset: Asset,
  limit?: string
): Promise<Transaction> {
  const sourceKp = Keypair.fromSecret(sourceSecret)
  const sourceAcc = await server.loadAccount(sourceKp.publicKey())
  return new TransactionBuilder(sourceAcc, {
    fee: BASE_FEE,
    networkPassphrase: "Test SDF Network ; September 2015",
  })
    .addOperation(
      Operation.changeTrust({
        asset,
        limit: limit ?? "922337203685.4775807",
      })
    )
    .setTimeout(30)
    .build()
}

export async function buildPathPaymentStrictSend(
  sourceSecret: string,
  destination: string,
  sendAsset: Asset,
  sendAmount: string,
  destinationAsset: Asset,
  destMin: string,
  path: Asset[],
  memo?: MemoValue
): Promise<Transaction> {
  const sourceKp = Keypair.fromSecret(sourceSecret)
  const sourceAcc = await server.loadAccount(sourceKp.publicKey())
  const tx = new TransactionBuilder(sourceAcc, {
    fee: BASE_FEE,
    networkPassphrase: "Test SDF Network ; September 2015",
  }).addOperation(
    Operation.pathPaymentStrictSend({
      sendAsset,
      sendAmount,
      destination,
      destAsset: destinationAsset,
      destMin,
      path,
    })
  )
  if (memo) tx.addMemo(makeMemo(memo)!)
  return tx.setTimeout(30).build()
}

export async function buildPathPaymentStrictReceive(
  sourceSecret: string,
  destination: string,
  sendAsset: Asset,
  sendMax: string,
  destinationAsset: Asset,
  destAmount: string,
  path: Asset[],
  memo?: MemoValue
): Promise<Transaction> {
  const sourceKp = Keypair.fromSecret(sourceSecret)
  const sourceAcc = await server.loadAccount(sourceKp.publicKey())
  const tx = new TransactionBuilder(sourceAcc, {
    fee: BASE_FEE,
    networkPassphrase: "Test SDF Network ; September 2015",
  }).addOperation(
    Operation.pathPaymentStrictReceive({
      sendAsset,
      sendMax,
      destination,
      destAsset: destinationAsset,
      destAmount,
      path,
    })
  )
  if (memo) tx.addMemo(makeMemo(memo)!)
  return tx.setTimeout(30).build()
}

export function signTransaction(tx: Transaction, secretKey: string): Transaction {
  const kp = Keypair.fromSecret(secretKey)
  tx.sign(kp)
  return tx
}

export async function submitTransaction(tx: Transaction): Promise<any> {
  return server.submitTransaction(tx)
}

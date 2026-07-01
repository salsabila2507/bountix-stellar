"use client"

import { useState } from "react"
import { useWallet } from "@/lib/stellar/wallet-context"
import { getContacts, addContact, updateContact, deleteContact, type Contact } from "@/lib/stellar/contacts-store"
import { StrKey } from "@stellar/stellar-sdk"

export default function ContactsPage() {
  const { publicKey, isLocked } = useWallet()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [memo, setMemo] = useState("")
  const [error, setError] = useState<string | null>(null)

  const refreshContacts = () => setContacts([...getContacts()])

  useState(() => refreshContacts())

  const resetForm = () => {
    setName("")
    setAddress("")
    setMemo("")
    setError(null)
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = () => {
    setError(null)
    if (!name.trim()) { setError("Name is required"); return }
    if (!address.trim()) { setError("Address is required"); return }
    if (!StrKey.isValidEd25519PublicKey(address.trim())) { setError("Invalid Stellar address"); return }

    if (editingId) {
      updateContact(editingId, { name: name.trim(), address: address.trim(), memo: memo.trim() || undefined })
    } else {
      addContact({ name: name.trim(), address: address.trim(), memo: memo.trim() || undefined })
    }
    resetForm()
    refreshContacts()
  }

  const handleEdit = (c: Contact) => {
    setEditingId(c.id)
    setName(c.name)
    setAddress(c.address)
    setMemo(c.memo ?? "")
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    deleteContact(id)
    refreshContacts()
  }

  if (isLocked || !publicKey) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-base-content/60">Unlock your wallet first.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowForm(true) }}>
          + Add
        </button>
      </div>

      {showForm && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body space-y-3">
            <h3 className="card-title">{editingId ? "Edit Contact" : "New Contact"}</h3>
            <div className="form-control">
              <label className="label"><span className="label-text">Name</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input input-bordered" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Stellar Address</span></label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input input-bordered font-mono text-sm" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Memo (optional)</span></label>
              <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="input input-bordered" />
            </div>
            {error && <div className="alert alert-error py-2 text-sm">{error}</div>}
            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost btn-sm" onClick={resetForm}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {contacts.length === 0 && !showForm ? (
        <div className="text-center py-8 text-base-content/60">
          <p>No contacts yet.</p>
          <p className="text-sm">Save addresses you frequently send to.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="card bg-base-200 shadow-sm">
              <div className="card-body p-4 flex-row items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="font-mono text-xs text-base-content/60 truncate">{c.address}</p>
                  {c.memo && <p className="text-xs text-base-content/40">Memo: {c.memo}</p>}
                </div>
                <div className="flex gap-1">
                  <button className="btn btn-ghost btn-xs" onClick={() => handleEdit(c)}>Edit</button>
                  <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(c.id)}>Del</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

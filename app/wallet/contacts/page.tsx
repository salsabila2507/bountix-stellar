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
        <p className="text-sm font-bold text-[#5a3b66]">Unlock your wallet first.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#140625]">Contacts</h1>
        <button
          className="inline-flex min-h-9 items-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] px-3 py-1 text-xs font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#ffdd3d]"
          onClick={() => { resetForm(); setShowForm(true) }}
        >
          + Add
        </button>
      </div>

      {showForm && (
        <div className="comic-card p-6 space-y-3">
          <h3 className="text-lg font-black text-[#140625]">{editingId ? "Edit Contact" : "New Contact"}</h3>
          <div>
            <label className="text-xs font-black uppercase text-[#5a3b66]">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-black uppercase text-[#5a3b66]">Stellar Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-mono font-bold text-[#140625] outline-none focus:bg-white" />
          </div>
          <div>
            <label className="text-xs font-black uppercase text-[#5a3b66]">Memo (optional)</label>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className="mt-1 block w-full rounded-lg border-2 border-[#140625] bg-[#fffaf4] px-3 py-2 text-sm font-bold text-[#140625] outline-none focus:bg-white" />
          </div>
          {error && <div className="rounded-lg border-2 border-[#ff4fb8] bg-[#fff0f5] px-3 py-2 text-sm font-bold text-[#140625]">{error}</div>}
          <div className="flex gap-2 justify-end">
            <button className="inline-flex min-h-9 items-center rounded-lg border-2 border-[#140625] bg-white px-3 py-1 text-xs font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]" onClick={resetForm}>Cancel</button>
            <button className="inline-flex min-h-9 items-center rounded-lg border-2 border-[#140625] bg-[#ffdd3d] px-3 py-1 text-xs font-black uppercase text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]" onClick={handleSave}>Save</button>
          </div>
        </div>
      )}

      {contacts.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <p className="text-sm font-bold text-[#5a3b66]">No contacts yet.</p>
          <p className="text-xs font-bold text-[#7c3cff]">Save addresses you frequently send to.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="comic-card p-4 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-[#140625]">{c.name}</h3>
                <p className="font-mono text-xs text-[#5a3b66] truncate">{c.address}</p>
                {c.memo && <p className="text-xs text-[#7c3cff]">Memo: {c.memo}</p>}
              </div>
              <div className="flex gap-1">
                <button className="rounded-lg border-2 border-[#140625] bg-white px-2 py-1 text-[0.65rem] font-black text-[#140625] shadow-[2px_2px_0_#140625] transition hover:bg-[#38e7ff]" onClick={() => handleEdit(c)}>Edit</button>
                <button className="rounded-lg border-2 border-[#ff4fb8] bg-white px-2 py-1 text-[0.65rem] font-black text-[#ff4fb8] shadow-[2px_2px_0_#ff4fb8] transition hover:bg-[#fff0f5]" onClick={() => handleDelete(c.id)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

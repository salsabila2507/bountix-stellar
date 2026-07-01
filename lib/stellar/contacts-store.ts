"use client"

export interface Contact {
  id: string
  name: string
  address: string
  memo?: string
  memoType?: string
}

const CONTACTS_KEY = "stellar_contacts"

function getContactsRaw(): Contact[] {
  if (typeof window === "undefined") return []
  const raw = localStorage.getItem(CONTACTS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveContacts(contacts: Contact[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts))
}

export function getContacts(): Contact[] {
  return getContactsRaw()
}

export function addContact(contact: Omit<Contact, "id">): Contact {
  const contacts = getContactsRaw()
  const newContact: Contact = { ...contact, id: crypto.randomUUID() }
  contacts.push(newContact)
  saveContacts(contacts)
  return newContact
}

export function updateContact(id: string, updates: Partial<Omit<Contact, "id">>): Contact | null {
  const contacts = getContactsRaw()
  const idx = contacts.findIndex((c) => c.id === id)
  if (idx === -1) return null
  contacts[idx] = { ...contacts[idx], ...updates }
  saveContacts(contacts)
  return contacts[idx]
}

export function deleteContact(id: string): boolean {
  const contacts = getContactsRaw()
  const filtered = contacts.filter((c) => c.id !== id)
  if (filtered.length === contacts.length) return false
  saveContacts(filtered)
  return true
}

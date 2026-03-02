export interface ClientSummary {
  id: string
  legal_name: string
  doc_number: string | null
  email: string | null
  phone: string | null
  party_type: string
  total_invoiced: number
  total_paid: number
  balance: number
  has_overdue: boolean
}

export interface ClientDocument {
  id: string
  number: string | null
  doc_type: string
  issue_date: string | null
  due_date: string | null
  total: number
  balance: number
  status: string
  party_id: string | null
}

export interface ClientPayment {
  id: string
  description: string | null
  amount: number
  transaction_type: string
  date: string | null
}

export interface ClientDetail {
  id: string
  legal_name: string
  doc_number: string | null
  email: string | null
  phone: string | null
  party_type: string
}

export interface AgingBucket {
  label: string
  days: string
  amount: number
  count: number
}

export type CardStatus =
  | 'DRAFT'
  | 'READY'
  | 'IN_PRODUCTION'
  | 'QC_PASSED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'REVOKED';

export type BusinessStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role?: string; // 'ADMIN' | 'SALES'
  status: string;
}

export interface InspectedCardToken {
  id: string;
  card_code: string;
  token: string;
  status: CardStatus;
  batch_id: string;
  is_assigned: boolean;
  business_id?: string | null;
  business_name?: string;
  google_review_url?: string;
}

export interface Business {
  id: string;
  name: string;
  google_review_url: string;
  status: BusinessStatus;
  verified_at?: string;
  verified_by?: string;
  total_cards: number;
  active_cards: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  business_id?: string | null;
  business_name?: string;
  google_review_url?: string;
  card_code: string;
  token: string;
  batch_id: string;
  status: CardStatus;
  qr_code_url?: string;
  tap_count: number;
  last_tapped_at?: string;
  activated_at?: string;
  revoked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionEvent {
  id: string;
  card_id: string;
  event_type: string;
  performed_by?: string;
  payload: Record<string, any>;
  notes?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id?: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ManifestItem {
  card_id: string;
  card_code: string;
  business_id: string;
  business_name: string;
  token: string;
  redirect_url: string;
  nfc_url: string;
  status: string;
  qr_code_url?: string;
}

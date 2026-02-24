export interface CollectionAgentConfig {
    id: string;
    tenant_id: string;
    is_active: boolean;
    grace_days: number;
    min_amount_threshold: number;
    auto_escalate_days: number;
    reminder_frequency_days: number;
    config_json: any;
}

export interface CollectionAction {
    id: string;
    tenant_id: string;
    document_id: string;
    action_type: 'REMINDER_1' | 'REMINDER_2' | 'FINAL_NOTICE' | 'ESCALATE' | 'LEGAL_ESCALATION';
    channel: 'EMAIL' | 'WHATSAPP' | 'SYSTEM';
    status: 'PENDING' | 'SENT' | 'FAILED';
    metadata: any;
    executed_at: string;
}

export interface DebtorProfile {
    id: string;
    tenant_id: string;
    party_id: string;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    average_payment_days: number;
    last_action_at: string | null;
    notes: string | null;
    excluded: boolean;
}

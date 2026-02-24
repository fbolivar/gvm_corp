
export interface VendorMetrics {
    party_id: string;
    total_purchased: number;
    pending_bills_amount: number;
    completed_orders: number;
    avg_lead_time_days: number;
    reliability_score: number; // 0 to 100
}

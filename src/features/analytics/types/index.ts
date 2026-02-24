
export interface ProductProfitability {
    product_id: string;
    product_name: string;
    sku: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    units_sold: number;
}

export interface CashFlowPoint {
    date: string;
    inflow: number;
    outflow: number;
    net: number;
    balance: number;
}

export interface AgingBuckets {
    current: number;
    "1-30": number;
    "31-60": number;
    "61-90": number;
    "90+": number;
}

export interface ExecutiveSummary {
    total_ar: number;
    total_ap: number;
    net_cash_flow: number;
    ar_aging: AgingBuckets;
    ap_aging: AgingBuckets;
    top_profitable_products: ProductProfitability[];
    agent_metrics?: {
        totalActions: number;
        totalRecoveredAmount: number;
        recoveryRate: number;
        isActive: boolean;
    };
    liquidity_metrics?: {
        immediate_liquidity: number;
        short_term_liabilities: number;
        pending_payroll: number;
        survival_days: number;
        burn_rate: number;
    };
    logistics_metrics?: {
        pending_dispatch: number;
        in_transit: number;
        delivered_today: number;
        avg_delivery_days: number;
    };
}

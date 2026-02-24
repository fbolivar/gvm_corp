export type NotificationCategory = 'OPERATIONS' | 'SECURITY' | 'INVENTORY' | 'BILLING' | 'LIQUIDITY' | 'LOGISTICS' | 'GENERAL';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AppNotification {
    id: string;
    user_id: string | null;
    tenant_id: string;
    title: string;
    body: string;
    link?: string;
    is_read: boolean;
    category: NotificationCategory;
    priority: NotificationPriority;
    created_at: string;
}

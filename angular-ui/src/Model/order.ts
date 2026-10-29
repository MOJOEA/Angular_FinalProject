export interface Order {
  order_id: number;
  customer_id: number;
  box_count: number;
  order_note: string;
  status: 'pending' | 'completed';
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  customer_name?: string;
}
export interface OrderCustomer {
  customer_id: number;
  name: string;
}

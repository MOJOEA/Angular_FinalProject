export interface WorkJob {
  work_id: number;
  job_code: string;
  color: string;
  status: 'pending' | 'shipping' | 'completed' | 'cancelled';
  total_orders: number;
  total_boxes: number;
  created_at: string;
  updated_at: string;
  stops: RouteStop[];
  geometry?: any;
  distance_km?: number; 
  duration_min?: number; 
  distance_raw?: number; 
  duration_raw?: number;
  distance?: any;
  duration?: any;
}


export interface RouteStop {
  stop_id: number;
  work_id: number;
  order_id: number;
  sequence_no: number;
  box_count: number;
  order_note: string;
  status: 'pending' | 'delivered' | 'cancelled';
  created_at: string;
  customer_id: number;
  customer_name: string;
  phone_number: string;
  location_name: string;
  latitude: number;
  longitude: number;
}

export interface PlanningOrder {
  order_id: number;
  customer_id: number;
  order_date: string;
  quantity: number;
  name: string;
  phone: string;
  latitude: number;
  longitude: number;
  distanceFromDepot: number;
  bearing: number;
  direction: string;
}

export interface ApiResponse {
  success: boolean;
  data: WorkJob[];
}

export interface WorkJob {
  work_id: number;
  job_code: string;
  color: string;
  status: 'pending' | 'shipping' | 'completed' | 'cancelled'; // ปรับเปลี่ยนตามสถานะจริงในระบบ
  total_orders: number;
  total_boxes: number;
  created_at: string; // ISO Date String
  updated_at: string; // ISO Date String
  stops: RouteStop[];
  geometry?: any; // เก็บ GeoJSON LineString จาก API
  distance_km?: number; 
  duration_min?: number; 
  distance_raw?: number; 
  duration_raw?: number;
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

export interface WorkOrder {
  work_order_id: string;
  orders: PlanningOrder[];
  routeCoordinates?: any[];
  routeDistance?: String;
  routeDuration?: String;
}


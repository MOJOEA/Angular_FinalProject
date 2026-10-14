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
  distance?: string; // ระยะทางรวมของ Work นี้
  duration?: string; // ระยะเวลาเดินทางรวมของ Work นี้
}

export interface WorkOrder {
  work_order_id: string;
  orders: PlanningOrder[];
  routeCoordinates?: any[];
  routeDistance?: String;
  routeDuration?: String;
}

export interface RouteStop {
  stop_id: number;
  work_id: number;
  order_id: number;
  sequence_no: number;
  box_count: number;
  order_note: string;
  order_status: 'pending' | 'delivered' | 'cancelled';
  order_created_at: string;
  customer_id: number;
  customer_name: string;
  phone_number: string;
  location_name: string;
  latitude: number;
  longitude: number;
}

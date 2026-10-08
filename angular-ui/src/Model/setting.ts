export interface SystemSetting {
  id?: number;                         // ไอดีหลักของระบบ (Optional สำหรับตอนสร้างใหม่)
  shop_name: string;                   // ชื่อของร้านค้า หรือคลังสินค้าหลัก
  shop_address: string;                // ที่อยู่ของร้านค้า/คลังสินค้า
  shop_latitude: number;               // พิกัดละติจูดของร้านค้า
  shop_longitude: number;              // พิกัดลองจิจูดของร้านค้า
  box_price: number;                   // ราคาขายสินค้าต่อ 1 กล่อง
  box_cost: number;                    // ต้นทุนสินค้าต่อ 1 กล่อง (ราคาวัตถุดิบ)
  rider_base_fee: number;              // ค่ารอบเริ่มต้นที่จ่ายให้ไรเดอร์เมื่อออกวิ่ง
  rider_fee_per_km_per_box: number;    // ค่าจ้างเสริมคิดตามระยะทาง (กม.) และจำนวนกล่องที่ส่ง
  rider_speed_kmh: number;             // ความเร็วเฉลี่ยของรถส่งของ (กม./ชม.) เพื่อคำนวณเวลาเดินทาง
  max_orders_per_rider: number;        // จำนวนออเดอร์สูงสุดที่ไรเดอร์ 1 คนจะแบกไปได้ในรอบนั้น
  max_boxes_per_order: number;         // จำนวนกล่องสินค้าสูงสุดที่อนุญาตต่อ 1 คำสั่งซื้อ
  departure_time: string;              // เวลาที่รถส่งของต้องเริ่มออกเดินทางจากร้าน (รูปแบบ "HH:MM:SS" หรือ "HH:MM")
  delivery_window_minutes: number;     // กรอบเวลา (นาที) ที่ต้องส่งสินค้าให้ถึงมือลูกค้าทั้งหมด
  service_radius_km: number;           // รัศมีระยะทางสูงสุด (กม.) จากร้านที่เปิดรับออเดอร์
  created_at?: Date | string;          // วันเวลาที่สร้างข้อมูล (ระบบจัดการให้อัตโนมัติ)
  updated_at?: Date | string;          // วันเวลาที่แก้ไขข้อมูลล่าสุด (ระบบจัดการให้อัตโนมัติ)
}

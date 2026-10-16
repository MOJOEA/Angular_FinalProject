import { WorkJob, RouteStop } from '../Model/work';
import { SystemSetting } from '../Model/setting';

/**
 * ผลลัพธ์การคำนวณทางการเงินของใบงาน
 */
export interface ProfitSummary {
  totalBoxes: number;          // จำนวนข้าวกล่องรวม (กล่อง)
  totalRevenue: number;        // รายรับรวม (บาท)
  foodCost: number;            // ต้นทุนอาหารรวม (บาท)
  grossProfit: number;         // กำไรขั้นต้น (บาท)
  riderBaseFee: number;        // ค่าเรียกรถพื้นฐาน (บาท)
  riderDistanceFee: number;    // ค่าจัดส่งตามระยะทาง (บาท)
  totalRiderCost: number;      // ค่าบริการไรเดอร์รวม (บาท)
  netProfit: number;           // กำไร / ขาดทุน สุทธิ (บาท)
  marginPercent: number;       // อัตรากำไรสุทธิ (%)
  isProfit: boolean;           // true = กำไร, false = ขาดทุน

  durationMins: number;      // เวลาจัดส่งโดยประมาณ (นาที)
  deadlineMins: number;      // กำหนดเวลาส่งสูงสุดตามตั้งค่า (นาที)
  isTimeExceeded: boolean;   // สถานะแจ้งเตือนเมื่อเวลาส่งเกินกำหนด (true/false)
}

/**
 * ผลลัพธ์การประเมินเวลาจัดส่ง
 */
export interface DeliveryTimeSummary {
  distanceKm: number;          // ระยะทางรวม (กิโลเมตร)
  durationMins: number;        // เวลาจัดส่งรวมโดยประมาณ (นาที)
  isTimeExceeded: boolean;     // เกินเวลาเส้นตายหรือไม่
  deadlineMins: number;        // เวลาเส้นตายที่กำหนดไว้ (นาที)
}

/**
 * ผลลัพธ์การตรวจสอบเงื่อนไขความถูกต้องของใบงาน
 */
export interface JobValidationResult {
  isValid: boolean;            // ผ่านเงื่อนไขทั้งหมดหรือไม่
  warnings: string[];          // ข้อความเตือน (ถ้ามี)
}

// ==========================================
// 1. HELPER FUNCTIONS (ตัวแปลงข้อมูลพื้นฐาน)
// ==========================================

/**
 * แปลง String ระยะทาง (เช่น "3.5 km", "3500 m") ให้เป็นตัวเลขกิโลเมตร (km)
 */
export function parseDistanceKm(distanceStr?: string | number): number {
  if (distanceStr === undefined || distanceStr === null) return 0;
  if (typeof distanceStr === 'number') return Math.max(0, distanceStr);

  const str = distanceStr.toLowerCase().trim();
  if (str.includes('km')) {
    return parseFloat(str.replace('km', '').trim()) || 0;
  }
  if (str.includes('m')) {
    return (parseFloat(str.replace('m', '').trim()) || 0) / 1000;
  }
  return parseFloat(str) || 0;
}

/**
 * แปลง String เวลา (เช่น "25 mins", "1.5 hr") ให้เป็นตัวเลขนาที (mins)
 */
export function parseDurationMins(durationStr?: string | number): number {
  if (durationStr === undefined || durationStr === null) return 0;
  if (typeof durationStr === 'number') return Math.max(0, durationStr);

  const str = durationStr.toLowerCase().trim();
  if (str.includes('hr') || str.includes('ชั่วโมง') || str.includes('ชม')) {
    return Math.round((parseFloat(str) || 0) * 60);
  }
  return Math.round(parseFloat(str) || 0);
}



// ==========================================
// 2. CORE CALCULATION FUNCTIONS (ฟังก์ชันคำนวณหลัก)
// ==========================================

/**
 * คำนวณสรุปกำไร-ขาดทุนทางการเงินของ WorkJob
 * @param job ข้อมูลใบงาน (WorkJob)
 * @param setting ข้อมูลตั้งค่าระบบ (SystemSetting)
 */
// =========================================================================
// [แก้ไขจุดที่ 4]: อัปเดตฟังก์ชัน calculateJobProfit เพื่อคำนวณเวลาและ Deadline
// =========================================================================
export function calculateJobProfit(job: WorkJob, setting: SystemSetting): ProfitSummary {
  // 1. คำนวณจำนวนกล่องรวม
  const totalBoxes = job.total_boxes > 0
    ? job.total_boxes
    : (job.stops || []).reduce((sum, stop) => sum + (stop.box_count || 0), 0);

  // 2. ดึงระยะทางรวมเป็นกิโลเมตร
  const distanceKm = parseDistanceKm(job.distance);

  // 🟢 [เพิ่มใหม่]: 3. คำนวณเรื่องเวลาจัดส่งและตรวจสอบ Deadline
  const durationMins = parseDurationMins(job.duration);
  // 🟢 [แก้ไข]: เปลี่ยนมาใช้ deadline_time ให้ตรงตาม SystemSetting ใน Model
  const deadlineMins = Number(setting?.deadline_time) || 60;
  const isTimeExceeded = durationMins > deadlineMins;

  // 4. คำนวณผลกำไรพื้นฐานเดิมจากตัวเลข
  const profitBase = calculateProfitFromValues(totalBoxes, distanceKm, setting);

  // 🟢 [เพิ่มใหม่]: 5. รวมผลการคำนวณเรื่องเวลากลับออกไป
  return {
    ...profitBase,
    durationMins,
    deadlineMins,
    isTimeExceeded
  };
}

/**
 * คำนวณกำไร-ขาดทุนจากจำนวนกล่องและระยะทางแบบระบุตัวเลขโดยตรง (แจกแจงใช้ได้ทุกโมดูล)
 * @param totalBoxes จำนวนกล่องรวม
 * @param distanceKm ระยะทางรวม (กิโลเมตร)
 * @param setting ข้อมูลตั้งค่าระบบ
 */
export function calculateProfitFromValues(
  totalBoxes: number,
  distanceKm: number,
  setting: SystemSetting
): ProfitSummary {
  const safeBoxes = Math.max(0, totalBoxes);
  const safeDistance = Math.max(0, distanceKm);

  // รายรับ และ ต้นทุนอาหาร
  const totalRevenue = safeBoxes * (setting.box_price || 0);
  const foodCost = safeBoxes * (setting.box_cost || 0);
  const grossProfit = totalRevenue - foodCost;

  // ค่าบริการไรเดอร์: ค่าเรียกรถพื้นฐาน + (จำนวนกล่อง x อัตราต่อกล่องต่อกิโลเมตร x ระยะทาง)
  const riderBaseFee = setting.rider_base_fee || 0;
  const riderDistanceFee = safeBoxes * (setting.rider_fee_box || 0) * safeDistance;
  const totalRiderCost = riderBaseFee + riderDistanceFee;

  // สรุปกำไร/ขาดทุนสุทธิ
  const netProfit = totalRevenue - foodCost - totalRiderCost;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalBoxes: safeBoxes,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    foodCost: parseFloat(foodCost.toFixed(2)),
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    riderBaseFee: parseFloat(riderBaseFee.toFixed(2)),
    riderDistanceFee: parseFloat(riderDistanceFee.toFixed(2)),
    totalRiderCost: parseFloat(totalRiderCost.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    marginPercent: parseFloat(marginPercent.toFixed(2)),
    isProfit: netProfit >= 0,

    // ค่าเริ่มต้นสำหรับเวลาจัดส่ง
    durationMins: 0,
    // 🟢 [แก้ไข]: เปลี่ยนมาใช้ deadline_time ให้ตรงตาม SystemSetting ใน Model
    deadlineMins: Number(setting?.deadline_time) || 60,
    isTimeExceeded: false
  };
}

/**
 * ประเมินเวลานำส่งและตรวจสอบเงื่อนไขความล่าช้า
 * @param job ข้อมูลใบงาน
 * @param setting ข้อมูลตั้งค่าระบบ
 */
export function estimateJobDeliveryTime(job: WorkJob, setting: SystemSetting): DeliveryTimeSummary {
  const distanceKm = parseDistanceKm(job.distance);
  let durationMins = parseDurationMins(job.duration);

  // กรณี API ไม่ได้คำนวณ duration มาให้ ให้คำนวณจากความเร็วเฉลี่ยไรเดอร์
  if (durationMins === 0 && distanceKm > 0) {
    const speed = setting.rider_speed_kmh || 30; // Default 30 km/h
    const drivingTime = (distanceKm / speed) * 60;
    const stopDelay = (job.stops?.length || 0) * 2; // เพิ่มเวลาจอดส่งจุดละ 2 นาที
    durationMins = Math.round(drivingTime + stopDelay);
  }

  const deadlineMins = setting.deadline_time || 60;

  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    durationMins,
    deadlineMins,
    isTimeExceeded: durationMins > deadlineMins
  };
}

/**
 * ตรวจสอบความถูกต้องและข้อจำกัดของใบงานตามกฎธุรกิจ
 * @param job ข้อมูลใบงาน
 * @param setting ข้อมูลตั้งค่าระบบ
 */
export function validateJobConstraints(job: WorkJob, setting: SystemSetting): JobValidationResult {
  const warnings: string[] = [];
  const maxOrders = setting.max_orders_rider || 3;
  const orderCount = job.total_orders || job.stops?.length || 0;

  // ตรวจสอบจำนวนออเดอร์ต่อไรเดอร์
  if (orderCount > maxOrders) {
    warnings.push(`จำนวนออเดอร์ (${orderCount}) เกินสิทธิ์ที่ไรเดอร์รับได้ (สูงสุด ${maxOrders} ออเดอร์)`);
  }

  // ตรวจสอบระยะเวลาจัดส่ง
  const timeSummary = estimateJobDeliveryTime(job, setting);
  if (timeSummary.isTimeExceeded) {
    warnings.push(`เวลาจัดส่งประเมิน ${timeSummary.durationMins} นาที เกินกำหนด ${timeSummary.deadlineMins} นาที`);
  }

  // ตรวจสอบผลตอบแทน
  const profitSummary = calculateJobProfit(job, setting);
  if (!profitSummary.isProfit) {
    warnings.push(`ใบงานนี้มีผลขาดทุนสุทธิ ${profitSummary.netProfit} บาท`);
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}
import { WorkJob, RouteStop } from '../Model/work';
import { SystemSetting } from '../Model/setting';

export interface ProfitSummary {
  totalBoxes: number;
  totalRevenue: number;
  foodCost: number;
  grossProfit: number;
  riderBaseFee: number;
  riderDistanceFee: number;
  totalRiderCost: number;
  netProfit: number;
  marginPercent: number;
  isProfit: boolean;
  durationMins: number;
  deadlineMins: number;
  isTimeExceeded: boolean;
}

export interface DeliveryTimeSummary {
  distanceKm: number;
  durationMins: number;
  isTimeExceeded: boolean;
  deadlineMins: number;
}

export interface JobValidationResult {
  isValid: boolean;
  warnings: string[];
}



export function parseDistanceKm(distanceStr?: string | number): number {
  if (distanceStr === undefined || distanceStr === null) return 0;
  if (typeof distanceStr === 'number') return Math.max(0, distanceStr);
  const str = distanceStr.toLowerCase().trim();
  if (str.includes('km')) return parseFloat(str.replace('km', '').trim()) || 0;
  if (str.includes('m')) return (parseFloat(str.replace('m', '').trim()) || 0) / 1000;
  return parseFloat(str) || 0;
}

export function parseDurationMins(durationStr?: string | number): number {
  if (durationStr === undefined || durationStr === null) return 0;
  if (typeof durationStr === 'number') return Math.max(0, durationStr);
  const str = durationStr.toLowerCase().trim();
  if (str.includes('hr') || str.includes('ชั่วโมง') || str.includes('ชม')) return Math.round((parseFloat(str) || 0) * 60);
  return Math.round(parseFloat(str) || 0);
}

// ฟังก์ชัน: คำนวณสรุปกำไรขาดทุนและตรวจสอบเวลาจัดส่งของใบงาน
export function calculateJobProfit(job: WorkJob, setting: SystemSetting): ProfitSummary {
  // 🟢 1. คำนวณจำนวนกล่องรวมโดยนำ box_count ในแต่ละจุดส่ง (stops) มาบวกกันทั้งหมด
  const sumBoxesFromStops = (job.stops || []).reduce(
    (sum, stop) => sum + (stop.box_count || 0), 
    0
  );
  // 🟢 2. กำหนดค่าให้ totalBoxes: ใช้ผลรวมจาก stops ก่อน (หากไม่มี stops ค่อยใช้ job.total_boxes)
  const totalBoxes = sumBoxesFromStops > 0 
    ? sumBoxesFromStops 
    : Math.max(0, job.total_boxes || 0);

    // 🟢 2. เขียนค่ากลับเข้าไปที่ job.total_boxes โดยตรง (เพื่อให้ HTML ที่ดึง job.total_boxes ไปโชว์ อัปเดตทันที)
  if (sumBoxesFromStops > 0) {
    job.total_boxes = sumBoxesFromStops;
  }
  //const totalBoxes = job.total_boxes > 0 ? job.total_boxes : (job.stops || []).reduce((sum, stop) => sum + (stop.box_count || 0), 0);
  const rawDistance = job.distance_km ?? (job.distance_raw ? job.distance_raw / 1000 : undefined) ?? job.distance ?? 0;
  const rawDuration = job.duration_min ?? (job.duration_raw ? job.duration_raw / 60 : undefined) ?? job.duration ?? 0;
  const distanceKm = parseDistanceKm(rawDistance);
  const durationMins = parseDurationMins(rawDuration);
  const deadlineMins = Number(setting?.deadline_time) || 60;
  const isTimeExceeded = durationMins > deadlineMins;
  const profitBase = calculateProfitFromValues(totalBoxes, distanceKm, setting);
  return { ...profitBase, durationMins, deadlineMins, isTimeExceeded };

}

// ฟังก์ชัน: คำนวณรายรับ ต้นทุน และกำไรจากจำนวนกล่องกับระยะทาง
export function calculateProfitFromValues(totalBoxes: number, distanceKm: number, setting: SystemSetting): ProfitSummary {
  const safeBoxes = Math.max(0, totalBoxes);
  const safeDistance = Math.max(0, distanceKm);
  const totalRevenue = safeBoxes * (setting.box_price || 0);
  const foodCost = safeBoxes * (setting.box_cost || 0);
  const grossProfit = totalRevenue - foodCost;
  const riderBaseFee = setting.rider_base_fee || 0;
  const riderDistanceFee = safeBoxes * (setting?.rider_fee_box || 0) * safeDistance;

  // const riderDistanceFee = safeBoxes * (setting.rider_fee_box || 0) * safeDistance;
  const totalRiderCost = Math.max(0, riderBaseFee + riderDistanceFee);
  // const totalRiderCost = safeBoxes * (setting.rider_fee_box * safeDistance);

  // const totalRiderCost = riderBaseFee + riderDistanceFee;

  const netProfit = totalRevenue - foodCost - totalRiderCost;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  return {
    totalBoxes: safeBoxes,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    foodCost: parseFloat(foodCost.toFixed(2)),
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    riderBaseFee: parseFloat(Number(riderBaseFee || 0).toFixed(2)),
    riderDistanceFee: parseFloat(riderDistanceFee.toFixed(2)),
    totalRiderCost: parseFloat(totalRiderCost.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    marginPercent: parseFloat(marginPercent.toFixed(2)),
    isProfit: netProfit >= 0,
    durationMins: 0,
    deadlineMins: Number(setting?.deadline_time) || 60,
    isTimeExceeded: false
  };
}

// ฟังก์ชัน: ประเมินเวลาจัดส่งจากระยะทางและความเร็วเฉลี่ยของไรเดอร์
export function estimateJobDeliveryTime(job: WorkJob, setting: SystemSetting): DeliveryTimeSummary {
  const rawDistance = job.distance_km ?? (job.distance_raw ? job.distance_raw / 1000 : undefined) ?? job.distance;
  const rawDuration = job.duration_min ?? (job.duration_raw ? job.duration_raw / 60 : undefined) ?? job.duration;
  // const distanceKm = parseDistanceKm(job.distance);
  // let durationMins = parseDurationMins(job.duration);
  const distanceKm = parseDistanceKm(rawDistance);
  let durationMins = parseDurationMins(rawDuration);
  if (durationMins === 0 && distanceKm > 0) {
    const speed = setting.rider_speed_kmh || 30;
    const drivingTime = (distanceKm / speed) * 60;
    const stopDelay = (job.stops?.length || 0) * 2;
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

// ฟังก์ชัน: ตรวจสอบจำนวนออเดอร์ เวลาจัดส่ง และผลกำไรของใบงาน
export function validateJobConstraints(job: WorkJob, setting: SystemSetting): JobValidationResult {
  const warnings: string[] = [];
  const maxOrders = setting.max_orders_rider || 3;
  const orderCount = job.total_orders || job.stops?.length || 0;
  if (orderCount > maxOrders) {
    warnings.push(`จำนวนออเดอร์ (${orderCount}) เกินสิทธิ์ที่ไรเดอร์รับได้ (สูงสุด ${maxOrders} ออเดอร์)`);
  }
  const timeSummary = estimateJobDeliveryTime(job, setting);
  if (timeSummary.isTimeExceeded) {
    warnings.push(`เวลาจัดส่งประเมิน ${timeSummary.durationMins} นาที เกินกำหนด ${timeSummary.deadlineMins} นาที`);
  }
  const profitSummary = calculateJobProfit(job, setting);
  if (!profitSummary.isProfit) {
    warnings.push(`ใบงานนี้มีผลขาดทุนสุทธิ ${profitSummary.netProfit} บาท`);
  }
  return { isValid: warnings.length === 0, warnings };
}

/* สร้างตัวแปรเก็บค่าใช้จ่ายใบงาน กำหนด 2 ตัวแปร เก็บค่าจำนวนกล่องที่เหลืออยู่ ค่า defalut = mapJob.stop.boxcount 
ค่าใช้จ่าย = 0 ,loop วน job stop length ในลูป สร้างตัวแปรชั่วคราวเก็บค่าใช้จ่ายจุดนั้น = 2*กล่องที่เหลืออยู่*ระยะทางจุดนั้น(แปลงเป้น km) 
2   ค่าใช้จ่าย += ค่าใช้จ่ายจุดนั้น 
3 จำนวนกล่องเหลือ -= stop.boxcount 
จบลูป
ตัวแปรค่าใช้จ่าย */
export function calculateRiderStepFee(mapJob: WorkJob): number {
  
  let remainingBoxes = (mapJob.stops || []).reduce(
    (sum, stop) => sum + (stop.box_count || stop.box_count || 0), 
    0
  );
  let totalCost = 0;

  for (const stop of mapJob.stops || []) {
    const rawDistance = stop.distance ?? (stop as any).distance_km ?? 0;
    const distanceKm = parseDistanceKm(rawDistance);
    
    // คำนวณ: 2 * กล่องคงเหลือ * ระยะทางจุดส่ง(กม.)
    const tempCost = 2 * remainingBoxes * distanceKm;
    totalCost += tempCost;

    
    // หักจำนวนกล่องจุดนี้ออก
    const stopBoxes = stop.box_count || (stop as any).boxcount || 0;
    remainingBoxes = Math.max(0, remainingBoxes - stopBoxes);
  }

  return parseFloat(totalCost.toFixed(2));
}

  // for (const stop of mapJob.stops || []) {
  //   const distanceKm = parseDistanceKm(stop.distance);
    
  //   // คำนวณค่าใช้จ่ายจุดนี้: 2 * กล่องที่เหลือ * ระยะทาง(กม.)
  //   const tempCost = 2 * remainingBoxes * distanceKm;
    
  //   totalCost += tempCost;
    
  //   // หักกล่องของจุดนี้ออก
  //   remainingBoxes -= (stop.box_count || stop.box_count || 0);
  // }

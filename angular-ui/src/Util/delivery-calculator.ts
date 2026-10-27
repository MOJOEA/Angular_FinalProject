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
export function calculateJobProfit(
  job: WorkJob,
  setting: SystemSetting
): ProfitSummary {
  const totalBoxes = Math.max(
    0,
    Number(job.total_boxes) > 0
      ? Number(job.total_boxes)
      : (job.stops || []).reduce(
          (sum, stop) => sum + Math.max(0, Number(stop.box_count) || 0),
          0
        )
  );

  const distanceKm = parseDistanceKm(job.distance ?? job.distance_km);
  const durationMins = parseDurationMins(job.duration ?? job.duration_min);
  const deadlineMins = Math.max(0, Number(setting.deadline_time) || 60);

  return {
    ...calculateProfitFromValues(totalBoxes, distanceKm, setting),
    durationMins,
    deadlineMins,
    isTimeExceeded: durationMins > deadlineMins,
  };
}

export function calculateProfitFromValues(
  totalBoxes: number,
  distanceKm: number,
  setting: SystemSetting
): ProfitSummary {
  const safeBoxes = Math.max(0, Number(totalBoxes) || 0);
  const safeDistance = Math.max(0, Number(distanceKm) || 0);

  const price = Math.max(0, Number(setting.box_price) || 0);
  const cost = Math.max(0, Number(setting.box_cost) || 0);
  const baseFee = Math.max(0, Number(setting.rider_base_fee) || 0);
  const distanceRate = Math.max(0, Number(setting.rider_fee_box) || 0);

  const totalRevenue = safeBoxes * price;
  const foodCost = safeBoxes * cost;
  const grossProfit = totalRevenue - foodCost;
  const riderBaseFee = baseFee;
  const riderDistanceFee = safeBoxes * distanceRate * safeDistance;
  const totalRiderCost = riderBaseFee + riderDistanceFee;
  const netProfit = grossProfit - totalRiderCost;
  const marginPercent =
    totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalBoxes: safeBoxes,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    foodCost: Number(foodCost.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    riderBaseFee: Number(riderBaseFee.toFixed(2)),
    riderDistanceFee: Number(riderDistanceFee.toFixed(2)),
    totalRiderCost: Number(totalRiderCost.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    marginPercent: Number(marginPercent.toFixed(2)),
    isProfit: netProfit >= 0,
    durationMins: 0,
    deadlineMins: Math.max(0, Number(setting.deadline_time) || 60),
    isTimeExceeded: false,
  };
}

// ฟังก์ชัน: ประเมินเวลาจัดส่งจากระยะทางและความเร็วเฉลี่ยของไรเดอร์
export function estimateJobDeliveryTime(job: WorkJob, setting: SystemSetting): DeliveryTimeSummary {
  const distanceKm = parseDistanceKm(job.distance);
  let durationMins = parseDurationMins(job.duration);
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

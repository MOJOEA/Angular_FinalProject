import { Injectable } from '@angular/core';

import { Order } from '../../Model/order';
import { Customer } from '../../Model/customer';
// เปิด export นำหน้า เพื่อให้ไฟล์อื่นเรียกใช้ประเภทข้อมูลเหล่านี้ได้โดยไม่เกิด Error TS2459
import { WorkOrder, PlanningOrder } from '../../Model/work';

import { Coordinate, DistanceService } from './distance.service';
import { BearingService } from './bearing.service';

@Injectable({
  providedIn: 'root'
})
export class WorkOrderService {
  private readonly maxOrdersPerWorkOrder = 3;

  constructor(
    private distanceService: DistanceService,
    private bearingService: BearingService
  ) {}

  // ฟังก์ชันหลักสำหรับรับออเดอร์มาจัดกลุ่มออกเป็นใบงาน (Work Orders)
  createWorkOrders( orders: Order[], customers: Customer[], depot: Coordinate ): WorkOrder[] {
    const planningOrders = this.prepareOrders(orders, customers, depot);
    return planningOrders.length ? this.distributeOrders(planningOrders) : [];
  }

  // จับคู่ข้อมูลออเดอร์กับพิกัดลูกค้า พร้อมคำนวณและจัดเรียงข้อมูล 3 ชั้นตามที่คุณกำหนด
  private prepareOrders( orders: Order[], customers: Customer[], depot: Coordinate ): PlanningOrder[] {
    // จุดสำคัญ: ใช้ Map เก็บข้อมูลลูกค้าเพื่อทำความเร็วในการค้นหาข้อมูล O(1)
    const customerMap = new Map(
      customers.map(customer => [customer.customer_id, customer])
    );

    // กำหนดลำดับความสำคัญของทิศทางตามเข็มนาฬิกา
    const directionOrder = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    return orders
      .map(order => {
        const customer = customerMap.get(order.customer_id);

        if (!customer) {
          console.warn(`ไม่พบ Customer ${order.customer_id} สำหรับ Order ${order.order_id}`);
          return null;
        }

        const coordinate: Coordinate = {
          latitude: customer.latitude,
          longitude: customer.longitude
        };

        const distance = this.distanceService.calculateDistance(depot, coordinate);
        const bearing = this.bearingService.calculateBearing(depot, coordinate);

        return {
          ...order,
          latitude: customer.latitude,
          longitude: customer.longitude,
          distanceFromDepot: distance,
          bearing,
          direction: this.bearingService.getDirection(bearing)
        };
      })
      .filter((order): order is PlanningOrder => order !== null)
      // เปลี่ยนการ .sort() ใหม่ตามเงื่อนไข 3 ชั้นที่คุณกำหนด
      .sort((a, b) => {
        // ชั้นที่ 1: เรียงตามลำดับทิศทาง (N -> NE -> E ...)
        const dirA = directionOrder.indexOf(a.direction);
        const dirB = directionOrder.indexOf(b.direction);
        if (dirA !== dirB) return dirA - dirB;

        // ชั้นที่ 2: ภายใต้ทิศเดียวกัน จับกลุ่ม Customer ID เดียวกันให้อยู่ด้วยกัน
        if (a.customer_id !== b.customer_id) {
          return String(a.customer_id).localeCompare(String(b.customer_id));
        }

        // ชั้นที่ 3: ภายใต้ทิศเดียวกัน ลูกค้าคนเดียวกัน เรียงตามระยะทางจากน้อยไปมาก
        return a.distanceFromDepot - b.distanceFromDepot;
      });
  }

  // วนลูปจัดกลุ่มออเดอร์ลงใบงาน โดยจำกัดจำนวนสูงสุดต่อหนึ่งใบงาน
  private distributeOrders(orders: PlanningOrder[]): WorkOrder[] {
    const remainingOrders = [...orders];
    const workOrders: WorkOrder[] = [];

    while (remainingOrders.length) {
      // จุดสำคัญ: ดึงออเดอร์แรกจากคิวที่เรียงไว้อย่างสมบูรณ์แล้วขึ้นมาเปิดใบงานใหม่
      const [seed] = remainingOrders.splice(0, 1);
      const workOrder = this.createWorkOrder([seed]);

      while (
        workOrder.orders.length < this.maxOrdersPerWorkOrder &&
        remainingOrders.length
      ) {
        // วนลูปค้นหาและดึงออเดอร์ถัดไปที่เข้าเงื่อนไขและเหมาะสมที่สุดจากรายการที่เหลือเข้ามาสวมในใบงานเดิมจนกว่าจะเต็ม
        const index = this.findBestOrderIndex(workOrder.orders, remainingOrders);
        workOrder.orders.push(remainingOrders.splice(index, 1)[0]);
        this.recalculateWorkOrder(workOrder);
      }

      workOrders.push(workOrder);
    }

    return workOrders;
  }

  // ค้นหาออเดอร์ถัดไปจากรายการที่เหลือ เพื่อเอาเข้ามาใส่รวมในใบงานปัจจุบันที่ยังไม่เต็ม
  private findBestOrderIndex(
    currentOrders: PlanningOrder[],
    remainingOrders: PlanningOrder[]
  ): number {
    const customers = new Set<Order['customer_id']>(
      currentOrders.map(order => order.customer_id)
    );
    const directions = new Set<string>(
      currentOrders.map(order => order.direction)
    );
    const averageBearing = this.calculateAverageBearing(currentOrders);
    const averageDistance = this.getAverageDistance(currentOrders);

    let bestIndex = 0;

    for (let i = 1; i < remainingOrders.length; i++) {
      if (
        this.isBetterOrder(
          remainingOrders[i],
          remainingOrders[bestIndex],
          customers,
          directions,
          averageBearing,
          averageDistance
        )
      ) {
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  // เปรียบเทียบออเดอร์สองตัว เพื่อตัดสินว่าตัวไหนควรถูกเลือกเข้าใบงานปัจจุบันมากกว่ากัน
  private isBetterOrder(
    current: PlanningOrder,
    best: PlanningOrder,
    customers: Set<Order['customer_id']>,
    directions: Set<string>,
    averageBearing: number,
    averageDistance: number
  ): boolean {
    // จุดยาก: เป็นจุดรวมเงื่อนไขตัดสินใจ เรียงตามความสำคัญ: ลูกค้าคนเดิม -> ทิศเดียวกัน -> องศาใกล้กัน -> ระยะทางใกล้กัน
    const currentCustomer = customers.has(current.customer_id);
    const bestCustomer = customers.has(best.customer_id);

    if (currentCustomer !== bestCustomer) {
      return currentCustomer;
    }

    const currentDirection = directions.has(current.direction);
    const bestDirection = directions.has(best.direction);

    if (currentDirection !== bestDirection) {
      return currentDirection;
    }

    const currentBearing = this.circularAngleDifference(averageBearing, current.bearing);
    const bestBearing = this.circularAngleDifference(averageBearing, best.bearing);

    if (currentBearing !== bestBearing) {
      return currentBearing < bestBearing;
    }

    return (
      Math.abs(averageDistance - current.distanceFromDepot) <
      Math.abs(averageDistance - best.distanceFromDepot)
    );
  }

  // คำนวณหาผลต่างของมุมองศาที่สั้นที่สุดระหว่างมุมสองมุม
  private circularAngleDifference(angle1: number, angle2: number): number {
    // จุดยาก: ต้องคำนวณแบบวงกลมรอบตัว 360 องศา ผลต่างจะไม่มีทางเกิน 180 องศา
    const difference = Math.abs(angle1 - angle2);
    return Math.min(difference, 360 - difference);
  }

  // หาค่าเฉลี่ยของมุมองศาจากกลุ่มออเดอร์ที่มีอยู่
  private calculateAverageBearing(orders: PlanningOrder[]): number {
    let x = 0;
    let y = 0;

    // จุดยาก: ไม่สามารถนำองศามาบวกกันแล้วหารตรงๆ ได้ ต้องแปลงเป็นเวกเตอร์ X, Y (Sin/Cos) ก่อนนำมาหาค่าเฉลี่ย
    for (const order of orders) {
      const radians = (order.bearing * Math.PI) / 180;
      x += Math.cos(radians);
      y += Math.sin(radians);
    }

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return bearing < 0 ? bearing + 360 : bearing;
  }

  // คำนวณหาระยะทางเฉลี่ยจากคลังสินค้าของกลุ่มออเดอร์ในใบงาน
  private getAverageDistance(orders: PlanningOrder[]): number {
    return orders.reduce((sum, order) => sum + order.distanceFromDepot, 0) / orders.length;
  }

  // สร้างอ็อบเจกต์ใบงานใหม่พร้อมสุ่ม ID (UUID) และคำนวณผลรวมสะสมเริ่มต้น
  private createWorkOrder(orders: PlanningOrder[]): WorkOrder {
    return {
      work_order_id: crypto.randomUUID(),
      orders: [...orders],
      totalQuantity: orders.reduce((sum, order) => sum + order.quantity, 0),
      estimatedDistance: orders.reduce((sum, order) => sum + order.distanceFromDepot, 0)
    };
  }

  // อัปเดตผลรวมจำนวนสินค้าและระยะทางสะสมทุกครั้งที่มีการเพิ่มออเดอร์เข้ากลุ่มเดิม
  private recalculateWorkOrder(workOrder: WorkOrder): void {
    workOrder.totalQuantity = workOrder.orders.reduce((sum: number, order: PlanningOrder) => sum + order.quantity, 0);
    workOrder.estimatedDistance = workOrder.orders.reduce((sum: number, order: PlanningOrder) => sum + order.distanceFromDepot, 0);
  }
}

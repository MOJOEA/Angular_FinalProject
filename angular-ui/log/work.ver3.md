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

  createWorkOrders( orders: Order[], customers: Customer[], depot: Coordinate ): WorkOrder[] {
    const planningOrders = this.prepareOrders(orders, customers, depot);
    return planningOrders.length ? this.distributeOrders(planningOrders) : [];
  }

  // เตรียมข้อมูลและเรียงลำดับพื้นฐานไว้ก่อน
  private prepareOrders( orders: Order[], customers: Customer[], depot: Coordinate ): PlanningOrder[] {
    const customerMap = new Map(customers.map(c => [c.customer_id, c]));
    const directionOrder = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

    return orders
      .map(order => {
        const customer = customerMap.get(order.customer_id);
        if (!customer) return null;

        const coordinate: Coordinate = { latitude: customer.latitude, longitude: customer.longitude };
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
      .sort((a, b) => {
        const dirA = directionOrder.indexOf(a.direction);
        const dirB = directionOrder.indexOf(b.direction);
        if (dirA !== dirB) return dirA - dirB;
        if (a.customer_id !== b.customer_id) return String(a.customer_id).localeCompare(String(b.customer_id));
        return a.distanceFromDepot - b.distanceFromDepot;
      });
  }

  // วนลูปเปรียบเทียบหาออเดอร์ที่เหมาะสมที่สุดเข้ากลุ่มแบบเวอร์ชั่นให้คะแนน
  private distributeOrders(orders: PlanningOrder[]): WorkOrder[] {
    const remainingOrders = [...orders];
    const workOrders: WorkOrder[] = [];

    while (remainingOrders.length) {
      // ดึงออเดอร์แรกสุดมาเปิดใบงาน
      const [seed] = remainingOrders.splice(0, 1);
      const workOrder = this.createWorkOrder([seed]);

      while (
        workOrder.orders.length < this.maxOrdersPerWorkOrder &&
        remainingOrders.length
      ) {
        // ค้นหาออเดอร์จากรายการที่เหลือทั้งหมดที่มีทิศและระยะทางใกล้เคียงกับออเดอร์ล่าสุดในใบงานมากที่สุด
        const index = this.findBestOrderIndex(workOrder.orders, remainingOrders);
        workOrder.orders.push(remainingOrders.splice(index, 1)[0]);
        this.recalculateWorkOrder(workOrder);
      }

      workOrders.push(workOrder);
    }

    return workOrders;
  }

  private findBestOrderIndex(currentOrders: PlanningOrder[], remainingOrders: PlanningOrder[]): number {
    const lastOrder = currentOrders[currentOrders.length - 1];
    let bestIndex = 0;
    let highestScore = -Infinity;

    for (let i = 0; i < remainingOrders.length; i++) {
      const current = remainingOrders[i];
      let score = 0;

      // 1. ถ้าเป็นลูกค้าคนเดียวกัน ให้คะแนนสูงสุด (เพื่อให้อยู่รถคันเดียวกัน)
      if (current.customer_id === lastOrder.customer_id) score += 1000;
      
      // 2. ถ้าอยู่ทิศเดียวกัน ให้คะแนนเพิ่ม
      if (current.direction === lastOrder.direction) score += 500;

      // 3. หักคะแนนตามความห่างของระยะทางจากคลังสินค้า (ยิ่งห่างกันยิ่งโดนหักคะแนนเยอะ)
      const distanceDiff = Math.abs(current.distanceFromDepot - lastOrder.distanceFromDepot);
      score -= distanceDiff * 10;

      // เลือกตัวที่ได้คะแนนรวมดีที่สุด
      if (score > highestScore) {
        highestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  private createWorkOrder(orders: PlanningOrder[]): WorkOrder {
    return {
      work_order_id: crypto.randomUUID(),
      orders: [...orders],
      totalQuantity: orders.reduce((sum, order) => sum + order.quantity, 0),
      estimatedDistance: orders.reduce((sum, order) => sum + order.distanceFromDepot, 0)
    };
  }

  private recalculateWorkOrder(workOrder: WorkOrder): void {
    workOrder.totalQuantity = workOrder.orders.reduce((sum, order) => sum + order.quantity, 0);
    workOrder.estimatedDistance = workOrder.orders.reduce((sum, order) => sum + order.distanceFromDepot, 0);
  }
}
import { Injectable } from '@angular/core';
import { Order } from '../../Model/order';
import { Customer } from '../../Model/customer';
import { Coordinate, DistanceService } from './distance.service';
import { BearingService } from './bearing.service';

export interface PlanningOrder extends Order {
  latitude: number;
  longitude: number;
  distanceFromDepot: number;
  bearing: number;
  direction: string;
}

export interface WorkOrder {
  work_order_id: string;
  orders: PlanningOrder[];
  totalQuantity: number;
  estimatedDistance: number;
}

@Injectable({
  providedIn: 'root'
})
export class WorkOrderService {
  private readonly maxOrdersPerWorkOrder = 3;
  private readonly maxBearingDifference = 35;

  constructor(
    private distanceService: DistanceService,
    private bearingService: BearingService
  ) {}

  createWorkOrders(
    orders: Order[],
    customers: Customer[],
    depot: Coordinate
  ): WorkOrder[] {
    const planningOrders = this.prepareOrders(orders, customers, depot);
    return planningOrders.length ? this.distributeBalanced(planningOrders) : [];
  }

  // เตรียมข้อมูล Order และเรียงจากใกล้ Depot ไปไกล
  private prepareOrders(
    orders: Order[],
    customers: Customer[],
    depot: Coordinate
  ): PlanningOrder[] {
    const customerMap = new Map(
      customers.map(customer => [customer.customer_id, customer])
    );

    return orders
      .reduce<PlanningOrder[]>((result, order) => {
        const customer = customerMap.get(order.customer_id);

        if (!customer) {
          console.warn(
            `ไม่พบ Customer ${order.customer_id} สำหรับ Order ${order.order_id}`
          );
          return result;
        }

        const coordinate: Coordinate = {
          latitude: customer.latitude,
          longitude: customer.longitude
        };

        const distance = this.distanceService.calculateDistance(depot, coordinate);
        const bearing = this.bearingService.calculateBearing(depot, coordinate);

        result.push({
          ...order,
          latitude: customer.latitude,
          longitude: customer.longitude,
          distanceFromDepot: distance,
          bearing,
          direction: this.bearingService.getDirection(bearing)
        });

        return result;
      }, [])
      .sort((a, b) => a.distanceFromDepot - b.distanceFromDepot);
  }

  // แบ่ง Order เป็น Work Order
  private distributeBalanced(orders: PlanningOrder[]): WorkOrder[] {
    const remainingOrders = [...orders];
    const workOrderCount = Math.ceil(
      remainingOrders.length / this.maxOrdersPerWorkOrder
    );
    const workOrders: WorkOrder[] = [];

    for (let i = 0; i < workOrderCount && remainingOrders.length; i++) {
      const workOrdersLeft = workOrderCount - i - 1;
      const seedIndex = this.findBestSeedIndex(remainingOrders);

      if (seedIndex < 0) break;

      const [seed] = remainingOrders.splice(seedIndex, 1);
      const workOrder = this.createWorkOrder([seed]);

      while (
        workOrder.orders.length < this.maxOrdersPerWorkOrder &&
        remainingOrders.length > workOrdersLeft
      ) {
        const index = this.findBestOrderIndex(workOrder, remainingOrders);
        if (index < 0) break;

        workOrder.orders.push(remainingOrders.splice(index, 1)[0]);
        this.recalculateWorkOrder(workOrder);
      }

      workOrders.push(workOrder);
    }

    this.distributeRemainingOrders(workOrders, remainingOrders);

    return workOrders.filter(workOrder => workOrder.orders.length);
  }

  // เลือก Customer ที่มี Order เหลือมากที่สุดเป็น Seed
  private findBestSeedIndex(orders: PlanningOrder[]): number {
    if (!orders.length) return -1;

    const customerCounts = new Map<number, number>();

    for (const order of orders) {
      customerCounts.set(
        order.customer_id,
        (customerCounts.get(order.customer_id) ?? 0) + 1
      );
    }

    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const count = customerCounts.get(order.customer_id) ?? 0;

      let score = count * 100000;

      if (count >= this.maxOrdersPerWorkOrder) {
        score += 50000;
      }

      score -= order.distanceFromDepot;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  // เลือก Order ที่เหมาะที่สุดสำหรับ Work Order
  private findBestOrderIndex(
    workOrder: WorkOrder,
    orders: PlanningOrder[]
  ): number {
    if (!orders.length) return -1;

    const targetBearing = this.calculateAverageBearing(workOrder.orders);
    const targetDistance = this.getAverageDistance(workOrder.orders);
    const referenceCustomer = workOrder.orders[0].customer_id;

    let bestIndex = 0;
    let bestScore = Infinity;

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];

      const sameCustomer = workOrder.orders.some(
        existing => existing.customer_id === order.customer_id
      );

      const sameDirection = workOrder.orders.some(
        existing => existing.direction === order.direction
      );

      const bearingDifference = this.circularAngleDifference(
        targetBearing,
        order.bearing
      );

      const distanceDifference = Math.abs(
        targetDistance - order.distanceFromDepot
      );

      let score = sameCustomer ? 0 : 1_000_000;
      score += sameDirection ? 0 : 100_000;
      score += bearingDifference *
        (bearingDifference <= this.maxBearingDifference ? 100 : 200);
      score += distanceDifference * 10;
      score += order.quantity;

      // Tie-breaker ให้ Customer เดียวกับ Order แรกมาก่อน
      if (order.customer_id === referenceCustomer) {
        score -= 1;
      }

      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  // เติม Order ที่ยังเหลือเข้า Work Order ที่ยังไม่เต็ม
  private distributeRemainingOrders(
    workOrders: WorkOrder[],
    remainingOrders: PlanningOrder[]
  ): void {
    while (remainingOrders.length) {
      let placed = false;

      for (const workOrder of workOrders) {
        if (workOrder.orders.length >= this.maxOrdersPerWorkOrder) continue;

        const index = this.findBestOrderIndex(workOrder, remainingOrders);
        if (index < 0) continue;

        workOrder.orders.push(remainingOrders.splice(index, 1)[0]);
        this.recalculateWorkOrder(workOrder);
        placed = true;
        break;
      }

      if (placed) continue;

      const workOrder = this.createWorkOrder([
        remainingOrders.shift()!
      ]);

      while (
        workOrder.orders.length < this.maxOrdersPerWorkOrder &&
        remainingOrders.length
      ) {
        const index = this.findBestOrderIndex(workOrder, remainingOrders);
        if (index < 0) break;

        workOrder.orders.push(remainingOrders.splice(index, 1)[0]);
      }

      this.recalculateWorkOrder(workOrder);
      workOrders.push(workOrder);
    }
  }

  private circularAngleDifference(angle1: number, angle2: number): number {
    const difference = Math.abs(angle1 - angle2);
    return Math.min(difference, 360 - difference);
  }

  private calculateAverageBearing(orders: PlanningOrder[]): number {
    if (!orders.length) return 0;

    let x = 0;
    let y = 0;

    for (const order of orders) {
      const radians = order.bearing * Math.PI / 180;
      x += Math.cos(radians);
      y += Math.sin(radians);
    }

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return bearing < 0 ? bearing + 360 : bearing;
  }

  private getAverageDistance(orders: PlanningOrder[]): number {
    if (!orders.length) return 0;

    return orders.reduce(
      (sum, order) => sum + order.distanceFromDepot,
      0
    ) / orders.length;
  }

  private createWorkOrder(orders: PlanningOrder[]): WorkOrder {
    return {
      work_order_id: crypto.randomUUID(),
      orders: [...orders],
      totalQuantity: orders.reduce(
        (sum, order) => sum + order.quantity,
        0
      ),
      estimatedDistance: orders.reduce(
        (sum, order) => sum + order.distanceFromDepot,
        0
      )
    };
  }

  private recalculateWorkOrder(workOrder: WorkOrder): void {
    workOrder.totalQuantity = workOrder.orders.reduce(
      (sum, order) => sum + order.quantity,
      0
    );

    workOrder.estimatedDistance = workOrder.orders.reduce(
      (sum, order) => sum + order.distanceFromDepot,
      0
    );
  }
}
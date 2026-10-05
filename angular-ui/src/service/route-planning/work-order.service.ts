import { inject, Injectable } from '@angular/core';

import { Order } from '../../Model/order';
import { Customer } from '../../Model/customer';
import { Coordinate } from '../../Model/coordinate';
import { WorkOrder, PlanningOrder } from '../../Model/work';

import { DistanceService } from './distance.service';
import { BearingService } from './bearing.service';

import { RoutesAMapService } from '../api/map/get.routesamap';

import { convertDistance } from '../../Util/convert/convertDistance';
import { convertDuration } from '../../Util/convert/convertDuration';

@Injectable({
  providedIn: 'root',
})
export class WorkOrderService {
  private routesAMapService = inject(RoutesAMapService);
  private readonly maxOrdersPerWorkOrder = 3;

  constructor(
    private distanceService: DistanceService,
    private bearingService: BearingService,
  ) {}

  // ฟังก์ชันหลักสำหรับรับออเดอร์มาจัดกลุ่มออกเป็นใบงาน
  createWorkOrders(orders: Order[], customers: Customer[], depot: Coordinate,): Promise<WorkOrder[]> {
    const planningOrders = this.prepareOrders(orders, customers, depot);
    return planningOrders.length ? this.distributeOrders(planningOrders, depot) : Promise.resolve([]);
  }

  // จับคู่ข้อมูลออเดอร์กับพิกัดลูกค้า พร้อมคำนวณระยะทางและมุมองศาจากคลังสินค้า
  private prepareOrders(orders: Order[], customers: Customer[], depot: Coordinate,): PlanningOrder[] {
    // จุดสำคัญ: ใช้ Map เก็บข้อมูลลูกค้าเพื่อทำความเร็วในการค้นหาข้อมูล O(1)
    const customerMap = new Map(customers.map((customer) => [customer.customer_id, customer]));

    return orders.map((order) => {
        const customer = customerMap.get(order.customer_id);

        if (!customer) {
          console.warn(`ไม่พบ Customer ${order.customer_id} สำหรับ Order ${order.order_id}`);
          return null;
        }

        const coordinate: Coordinate = { latitude: customer.latitude, longitude: customer.longitude,};
        const distance = this.distanceService.calculateDistance(depot, coordinate);
        const bearing = this.bearingService.calculateBearing(depot, coordinate);

        return {
          ...order,
          latitude: customer.latitude,
          longitude: customer.longitude,
          distanceFromDepot: distance,
          bearing,
          direction: this.bearingService.getDirection(bearing),
        };
      })
      .filter((order): order is PlanningOrder => order !== null)
      .sort((a, b) => a.distanceFromDepot - b.distanceFromDepot);
  }

  // วนลูปจัดกลุ่มออเดอร์ลงใบงาน โดยจำกัดจำนวนสูงสุดต่อหนึ่งใบงาน
  private async distributeOrders(orders: PlanningOrder[], depot: Coordinate): Promise<WorkOrder[]> {
    const remainingOrders = [...orders];
    const workOrders: WorkOrder[] = [];

    while (remainingOrders.length) {
      const seedIndex = this.findBestSeedIndex(remainingOrders);
      const [seed] = remainingOrders.splice(seedIndex, 1);
      let workOrder = this.createWorkOrder([seed]);

      while (workOrder.orders.length < this.maxOrdersPerWorkOrder && remainingOrders.length) {
        const index = this.findBestOrderIndex(workOrder.orders, remainingOrders);
        workOrder.orders.push(remainingOrders.splice(index, 1)[0]);
      }

      workOrder.orders = this.optimizeRouteSequence(workOrder.orders, depot);
      const res = await this.createFletRoutesMap(workOrder.orders, depot);
      const routeCoordinates = (res as any).routes[0].geometry.coordinates;
      const routeDistance = convertDistance((res as any).routes[0].distance);
      const routeDuration = convertDuration((res as any).routes[0].duration);

      workOrder = {
        ...workOrder,
        routeDistance,
        routeDuration,
      };

      this.recalculateWorkOrder(workOrder);
      workOrders.push(workOrder);
    }

    return workOrders;
  }

  private createFletRoutesMap(orders: PlanningOrder[], depot: Coordinate): Promise<any> {
    const waypoints = orders.map((order) => ({ latitude: order.latitude, longitude: order.longitude }));
    return this.routesAMapService.getRoute(depot, waypoints);
  }

  // ค้นหาออเดอร์ที่เหมาะสมที่สุดที่จะนำมาเป็นตัวตั้งต้นของใบงานใหม่
  private findBestSeedIndex(orders: PlanningOrder[]): number {
    const customerCounts = new Map<Order['customer_id'], number>();

    for (const order of orders) {
      customerCounts.set(order.customer_id, (customerCounts.get(order.customer_id) ?? 0) + 1);
    }

    let bestIndex = 0;

    for (let i = 1; i < orders.length; i++) {
      const current = orders[i];
      const best = orders[bestIndex];

      const currentCount = customerCounts.get(current.customer_id) ?? 0;
      const bestCount = customerCounts.get(best.customer_id) ?? 0;

      // จุดสำคัญ: เลือกออเดอร์ของลูกค้าที่มีรายการสั่งซื้อซ้ำเยอะที่สุดก่อน ถ้าเท่ากันจะเลือกตัวที่ใกล้คลังสินค้าที่สุด
      if (
        currentCount > bestCount ||
        (currentCount === bestCount && current.distanceFromDepot < best.distanceFromDepot)
      ) {
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  // หาออเดอร์ถัดไปจากรายการที่เหลือ เพื่อเอาเข้ามาใส่รวมในใบงานปัจจุบันที่ยังไม่เต็ม
  private findBestOrderIndex(
    currentOrders: PlanningOrder[],
    remainingOrders: PlanningOrder[],
  ): number {
    const customers = new Set<Order['customer_id']>(
      currentOrders.map((order) => order.customer_id),
    );
    const directions = new Set<string>(currentOrders.map((order) => order.direction));
    const averageBearing = this.bearingService.calculateAverageBearing(currentOrders);
    const averageDistance = this.distanceService.getAverageDistance(currentOrders);

    let bestIndex = 0;

    for (let i = 1; i < remainingOrders.length; i++) {
      if ( this.isBetterOrder( remainingOrders[i], remainingOrders[bestIndex], customers, directions, averageBearing, averageDistance,)
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
    averageDistance: number,
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

  // ค้นหาลำดับการวิ่งส่งของลูกค้าจากจุดที่ใกล้ที่สุดไปเรื่อยๆ (Nearest Neighbor)
  private optimizeRouteSequence(orders: PlanningOrder[], depot: Coordinate): PlanningOrder[] {
    if (orders.length <= 1) return orders;

    const optimized: PlanningOrder[] = [];
    const unvisited = [...orders];
    let currentPosition: Coordinate = { latitude: depot.latitude, longitude: depot.longitude };

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const orderCoord: Coordinate = {
          latitude: unvisited[i].latitude,
          longitude: unvisited[i].longitude,
        };
        const dist = this.distanceService.calculateDistance(currentPosition, orderCoord);

        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      const [nextOrder] = unvisited.splice(nearestIndex, 1);
      optimized.push(nextOrder);
      currentPosition = { latitude: nextOrder.latitude, longitude: nextOrder.longitude };
    }

    return optimized;
  }

  // คำนวณหาผลต่างของมุมองศาที่สั้นที่สุดระหว่างมุมสองมุม
  private circularAngleDifference(angle1: number, angle2: number): number {
    // จุดยาก: ต้องคำนวณแบบวงกลมรอบตัว 360 องศา ผลต่างจะไม่มีทางเกิน 180 องศา
    const difference = Math.abs(angle1 - angle2);
    return Math.min(difference, 360 - difference);
  }

  // สร้างอ็อบเจกต์ใบงานใหม่พร้อมสุ่ม ID (UUID) และคำนวณผลรวมสะสมเริ่มต้น
  private createWorkOrder(orders: PlanningOrder[]): WorkOrder {
    return {
      work_order_id: crypto.randomUUID(),
      orders: [...orders],
      totalQuantity: orders.reduce((sum, order) => sum + order.quantity, 0),
      estimatedDistance: orders.reduce((sum, order) => sum + order.distanceFromDepot, 0),
    };
  }

  // อัปเดตผลรวมจำนวนสินค้าและระยะทางสะสมทุกครั้งที่มีการเพิ่มออเดอร์เข้ากลุ่มเดิม
  private recalculateWorkOrder(workOrder: WorkOrder): void {
    workOrder.totalQuantity = workOrder.orders.reduce(
      (sum: number, order: PlanningOrder) => sum + order.quantity, 0
    );
    workOrder.estimatedDistance = workOrder.orders.reduce(
      (sum: number, order: PlanningOrder) => sum + order.distanceFromDepot, 0,
    );
  }
}

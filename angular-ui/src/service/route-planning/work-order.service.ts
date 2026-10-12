import { inject, Injectable } from '@angular/core';
import * as turf from '@turf/turf';

import { Order } from '../../Model/order';
import { Customer } from '../../Model/customer';
import { Coordinate } from '../../Model/coordinate';
import { WorkOrder, PlanningOrder } from '../../Model/work';

import { RoutesAMapService } from '../api/routesamap';

import { convertDistance } from '../../Util/convert/convertDistance';
import { convertDuration } from '../../Util/convert/convertDuration';

@Injectable({
  providedIn: 'root',
})
export class WorkOrderService {
  private routesAMapService = inject(RoutesAMapService);
  private readonly maxOrdersPerWorkOrder = 3;

  // กำหนด depot เป็น Property ของคลาสเพื่อลดการส่งค่าซ้ำซ้อน
  public depot!: Coordinate; 

  constructor() {}

  // ฟังก์ชันหลักสำหรับรับออเดอร์มาจัดกลุ่มออกเป็นใบงาน (รับ depot มาเซตลง Property ครั้งเดียว)
  createWorkOrders(orders: Order[], customers: Customer[], depot: Coordinate): Promise<WorkOrder[]> {
    this.depot = depot;
    const planningOrders = this.prepareOrders(orders, customers);
    return planningOrders.length ? this.distributeOrders(planningOrders) : Promise.resolve([]);
  }

  // จับคู่ข้อมูลออเดอร์กับพิกัดลูกค้า พร้อมคำนวณระยะทางและมุมองศาจากคลังสินค้า
  private prepareOrders(orders: Order[], customers: Customer[]): PlanningOrder[] {
    const customerMap = new Map(customers.map((c) => [c.customer_id, c]));
    const depotPoint = turf.point([this.depot.longitude, this.depot.latitude]);

    return orders
      .map((order) => {
        const customer = customerMap.get(order.customer_id);
        if (!customer) return null;

        const customerPoint = turf.point([customer.longitude, customer.latitude]);
        const distance = turf.distance(depotPoint, customerPoint, { units: 'kilometers' });
        const bearing = turf.bearing(depotPoint, customerPoint);
        
        return {
          ...order,
          ...customer,
          distanceFromDepot: distance,
          bearing,
          direction: this.getDirection(bearing),
        };
      })
      .filter((o): o is PlanningOrder => o !== null)
      .sort((a, b) => a.distanceFromDepot - b.distanceFromDepot);
  }

  // วนลูปจัดกลุ่มออเดอร์ลงใบงาน โดยจำกัดจำนวนสูงสุดต่อหนึ่งใบงาน
  private async distributeOrders(orders: PlanningOrder[]): Promise<WorkOrder[]> {
    const remainingOrders = [...orders];
    const workOrders: WorkOrder[] = [];

    while (remainingOrders.length) {
      const randomIndex = Math.floor(Math.random() * remainingOrders.length);
      const [seed] = remainingOrders.splice(randomIndex, 1);
      let workOrder = this.createWorkOrder([seed]);

      let max = 3

      while (workOrder.orders.length < max && remainingOrders.length) {
        const index = this.findBestOrderIndex(workOrder.orders, remainingOrders);
        workOrder.orders.push(remainingOrders.splice(index, 1)[0]);
      }

      const res = await this.createFletRoutesMap(workOrder.orders);
      const routeCoordinates = (res as any).routes[0].geometry.coordinates;
      const routeDistance = convertDistance((res as any).routes[0].distance);
      const routeDuration = convertDuration((res as any).routes[0].distance);

      workOrder = {
        ...workOrder,
        routeCoordinates,
        routeDistance,
        routeDuration,
      };
      workOrders.push(workOrder);
    }

    return workOrders;
  }

  private createFletRoutesMap(orders: PlanningOrder[]): Promise<any> {
    const waypoints = orders.map((order) => ({ latitude: order.latitude, longitude: order.longitude }));
    return this.routesAMapService.getRoute(this.depot, waypoints);
  }

  // หาออเดอร์ถัดไปจากรายการที่เหลือ เพื่อเอาเข้ามาใส่รวมในใบงานปัจจุบันที่ยังไม่เต็ม
  private findBestOrderIndex(currentOrders: PlanningOrder[], remainingOrders: PlanningOrder[]): number {
    if (remainingOrders.length === 0) return -1;

    const customers = new Set(currentOrders.map(o => o.customer_id));
    const directions = new Set(currentOrders.map(o => o.direction));
    
    const avgBearing = this.calculateAverageBearing(currentOrders);
    const avgDistance = currentOrders.reduce((sum, o) => sum + o.distanceFromDepot, 0) / currentOrders.length;

    let bestIndex = 0;
    for (let i = 1; i < remainingOrders.length; i++) {
      if (this.isBetterOrder(remainingOrders[i], remainingOrders[bestIndex], customers, directions, avgBearing, avgDistance)) {
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
    if (customers.has(current.customer_id) !== customers.has(best.customer_id)) return customers.has(current.customer_id);
    if (directions.has(current.direction) !== directions.has(best.direction)) return directions.has(current.direction);
    
    const diffCurrent = Math.abs(averageBearing - current.bearing);
    const diffBest = Math.abs(averageBearing - best.bearing);
    const currentBearing = Math.min(diffCurrent, 360 - diffCurrent);
    const bestBearing = Math.min(diffBest, 360 - diffBest);
    if (currentBearing !== bestBearing) { return currentBearing < bestBearing;}
    
    return Math.abs(averageDistance - current.distanceFromDepot) < Math.abs(averageDistance - best.distanceFromDepot);
  }

  // สร้างอ็อบเจกต์ใบงานใหม่พร้อมสุ่ม ID (UUID) และคำนวณผลรวมสะสมเริ่มต้น
  private createWorkOrder(orders: PlanningOrder[]): WorkOrder {
    return {
      work_order_id: crypto.randomUUID(),
      orders: [...orders],
    };
  }

  // คืนค่าทิศทางตามองศา Bearing (-180 ถึง 180)
  private getDirection(bearing: number): string {
    const positiveBearing = bearing < 0 ? bearing + 360 : bearing;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(positiveBearing / 45) % 8;
    return directions[index];
  }

  // คำนวณมุมองศาเฉลี่ยโดยใช้ฟังก์ชันการหาจุดศูนย์กลางทางภูมิศาสตร์ (Center/Centroid) ของ Turf.js
  private calculateAverageBearing(orders: PlanningOrder[]): number {
    if (orders.length === 0) return 0;
    
    const points = orders.map(o => turf.point([o.longitude, o.latitude]));
    const featureCollection = turf.featureCollection(points);
    
    const centerPoint = turf.center(featureCollection);
    const depotPoint = turf.point([this.depot.longitude, this.depot.latitude]);
    
    return turf.bearing(depotPoint, centerPoint);
  }
}

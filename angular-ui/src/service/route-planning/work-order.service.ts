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

interface CustomerGroup {
  customerId: number;
  latitude: number;
  longitude: number;
  distanceFromDepot: number;
  bearing: number;
  orders: PlanningOrder[];
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
    if (!planningOrders.length) {
      return [];
    }

    const customerGroups = this.groupByCustomer(planningOrders);
    return this.distributeBalanced(
      customerGroups
    );
  }

  /**
   * เตรียมข้อมูล Order
   */
  private prepareOrders(
    orders: Order[],
    customers: Customer[],
    depot: Coordinate
  ): PlanningOrder[] {

    const result: PlanningOrder[] = [];

    for (const order of orders) {

      const customer =
        customers.find(
          c =>
            c.customer_id ===
            order.customer_id
        );

      if (!customer) {
        console.warn(
          `ไม่พบ Customer ${order.customer_id} สำหรับ Order ${order.order_id}`
        );
        continue;
      }

      const coordinate: Coordinate = {
        latitude: customer.latitude,
        longitude: customer.longitude
      };

      const distance =
        this.distanceService.calculateDistance(
          depot,
          coordinate
        );

      const bearing =
        this.bearingService.calculateBearing(
          depot,
          coordinate
        );

      result.push({
        ...order,
        latitude: customer.latitude,
        longitude: customer.longitude,
        distanceFromDepot: distance,
        bearing,
        direction:
          this.bearingService.getDirection(
            bearing
          )
      });
    }

    /**
     * เรียงจากใกล้ Depot ไปไกล
     */
    return result.sort(
      (a, b) =>
        a.distanceFromDepot -
        b.distanceFromDepot
    );
  }

  /**
   * Group Order ตาม Customer
   */
  private groupByCustomer(
    orders: PlanningOrder[]
  ): CustomerGroup[] {

    const map =
      new Map<number, CustomerGroup>();

    for (const order of orders) {

      const existing =
        map.get(
          order.customer_id
        );

      if (existing) {

        existing.orders.push(
          order
        );

      } else {

        map.set(
          order.customer_id,
          {
            customerId:
              order.customer_id,

            latitude:
              order.latitude,

            longitude:
              order.longitude,

            distanceFromDepot:
              order.distanceFromDepot,

            bearing:
              order.bearing,

            orders: [order]
          }
        );
      }
    }

    return Array.from(
      map.values()
    );
  }

  /**
   * ============================================================
   * MAIN DISTRIBUTION
   * ============================================================
   *
   * หลักการ:
   *
   * 1. คำนวณจำนวน Work Order ที่ต้องใช้
   * 2. แต่ละ Work Order มีได้สูงสุด 3 Orders
   * 3. เลือก Customer ที่มี Order เหลือมากที่สุดเป็นตัวตั้ง
   * 4. เติม Order โดยให้ความสำคัญ:
   *
   *    Priority 1 = Customer เดียวกัน
   *    Priority 2 = ทิศเดียวกัน
   *    Priority 3 = ทิศใกล้กัน
   *    Priority 4 = ทิศที่ใกล้ที่สุด
   *
   * 5. ไม่ปล่อย Work Order ว่าง ถ้ายังมี Order เหลือ
   * 6. ไม่ใช้ 35° เป็น hard limit
   */
  private distributeBalanced(
    customerGroups: CustomerGroup[]
  ): WorkOrder[] {

    /**
     * Flatten กลับมาเป็น Order ทั้งหมด
     */
    const remainingOrders =
      customerGroups
        .flatMap(
          group => [...group.orders]
        );

    if (!remainingOrders.length) {
      return [];
    }

    /**
     * จำนวน Work Order ที่ต้องสร้าง
     *
     * เช่น
     * 30 Orders = 10 Work Orders
     * 29 Orders = 10 Work Orders
     * 28 Orders = 10 Work Orders
     */
    const workOrderCount =
      Math.ceil(
        remainingOrders.length /
        this.maxOrdersPerWorkOrder
      );

    const workOrders: WorkOrder[] = [];

    /**
     * สร้าง Work Order ตามจำนวนที่ต้องใช้
     */
    for (
      let i = 0;
      i < workOrderCount;
      i++
    ) {

      /**
       * จำนวน Work Order ที่ยังต้องสร้างหลังจากใบนี้
       */
      const workOrdersLeft =
        workOrderCount -
        i -
        1;

      /**
       * จำนวน Order ที่เหลือก่อนสร้างใบนี้
       */
      const ordersLeft =
        remainingOrders.length;

      /**
       * เลือก Seed
       *
       * พยายามเลือก Customer ที่มี Order เหลือมากที่สุด
       * เพื่อเพิ่มโอกาสรวม Customer เดียวกัน
       */
      const seedIndex =
        this.findBestSeedIndex(
          remainingOrders,
          workOrdersLeft
        );

      if (seedIndex < 0) {
        break;
      }

      const [
        seed
      ] =
        remainingOrders.splice(
          seedIndex,
          1
        );

      const workOrder =
        this.createWorkOrder([
          seed
        ]);

      /**
       * จำนวนที่ใบนี้ควรรับเพิ่ม
       *
       * ปกติเติมจนเต็ม 3
       *
       * แต่ต้องเหลือ Order เพียงพอสำหรับ
       * Work Order ใบถัดไปด้วย
       */
      while (
        workOrder.orders.length <
          this.maxOrdersPerWorkOrder &&
        remainingOrders.length >
          workOrdersLeft
      ) {

        const bestIndex =
          this.findBestOrderIndex(
            workOrder,
            remainingOrders
          );

        if (bestIndex < 0) {
          break;
        }

        const [
          order
        ] =
          remainingOrders.splice(
            bestIndex,
            1
          );

        workOrder.orders.push(
          order
        );

        this.recalculateWorkOrder(
          workOrder
        );
      }

      workOrders.push(
        workOrder
      );
    }

    /**
     * Safety net:
     *
     * ถ้ามี Order เหลือด้วยเหตุผลใดก็ตาม
     * จะเติมกลับเข้า Work Order ที่ยังไม่เต็ม
     */
    this.distributeRemainingOrders(
      workOrders,
      remainingOrders
    );

    return workOrders.filter(
      workOrder =>
        workOrder.orders.length > 0
    );
  }

  /**
   * ============================================================
   * หา Seed ที่เหมาะสม
   * ============================================================
   *
   * ให้ Customer ที่มี Order เหลือมากที่สุดมาก่อน
   *
   * เพื่อให้เกิด pattern เช่น:
   *
   * Customer A = 3 Orders
   * Customer B = 3 Orders
   * Customer C = 2 Orders
   *
   * ผลที่ต้องการ:
   *
   * A A A
   * B B B
   * C C ...
   */
  private findBestSeedIndex(
    orders: PlanningOrder[],
    workOrdersLeft: number
  ): number {

    if (!orders.length) {
      return -1;
    }

    let bestIndex = 0;
    let bestScore = -Infinity;

    for (
      let i = 0;
      i < orders.length;
      i++
    ) {

      const order =
        orders[i];

      /**
       * นับจำนวน Order ของ Customer นี้
       * ที่ยังเหลืออยู่
       */
      const sameCustomerCount =
        orders.filter(
          other =>
            other.customer_id ===
            order.customer_id
        ).length;

      /**
       * ให้ Customer ที่มี Orders เยอะ
       * เป็น Seed ก่อน
       */
      let score =
        sameCustomerCount *
        100000;

      /**
       * ถ้า Customer นี้มีจำนวน Order
       * สามารถรวมได้พอดีกับ Work Order
       * ให้คะแนนเพิ่ม
       */
      if (
        sameCustomerCount >=
        this.maxOrdersPerWorkOrder
      ) {
        score += 50000;
      }

      /**
       * ใกล้ Depot ก่อน
       */
      score -=
        order.distanceFromDepot;

      if (
        score >
        bestScore
      ) {
        bestScore =
          score;

        bestIndex =
          i;
      }
    }

    return bestIndex;
  }

  /**
   * ============================================================
   * หา Order ที่เหมาะสมที่สุดเพื่อเติม Work Order
   * ============================================================
   *
   * Priority:
   *
   * 1. Customer เดียวกัน
   * 2. Direction เดียวกัน
   * 3. Bearing ใกล้กัน
   * 4. Distance ใกล้กัน
   *
   * สำคัญ:
   *
   * ไม่มีการ reject Order เพราะ bearing > 35°
   *
   * 35° เป็นเพียงตัวช่วยจัดลำดับ
   */
  private findBestOrderIndex(
    workOrder: WorkOrder,
    orders: PlanningOrder[]
  ): number {

    if (!orders.length) {
      return -1;
    }

    if (!workOrder.orders.length) {
      return 0;
    }

    /**
     * ใช้ Order แรกเป็นแกนหลัก
     */
    const referenceOrder =
      workOrder.orders[0];

    const targetBearing =
      this.calculateAverageBearing(
        workOrder.orders
      );

    const targetDistance =
      this.getAverageDistance(
        workOrder.orders
      );

    let bestIndex = 0;
    let bestScore = Infinity;

    for (
      let i = 0;
      i < orders.length;
      i++
    ) {

      const order =
        orders[i];

      /**
       * ========================================================
       * Priority 1: Customer เดียวกัน
       * ========================================================
       */
      const sameCustomer =
        workOrder.orders.some(
          existing =>
            existing.customer_id ===
            order.customer_id
        );

      /**
       * ========================================================
       * Priority 2: Direction เดียวกัน
       * ========================================================
       */
      const sameDirection =
        workOrder.orders.some(
          existing =>
            existing.direction ===
            order.direction
        );

      /**
       * ========================================================
       * Priority 3: Bearing
       * ========================================================
       */
      const bearingDifference =
        this.circularAngleDifference(
          targetBearing,
          order.bearing
        );

      /**
       * ========================================================
       * Priority 4: Distance
       * ========================================================
       */
      const distanceDifference =
        Math.abs(
          targetDistance -
          order.distanceFromDepot
        );

      /**
       * ========================================================
       * สร้าง Score
       * ========================================================
       *
       * ยิ่งน้อย = ยิ่งดี
       *
       * Customer เดียวกัน:
       *    ได้ Priority สูงสุด
       *
       * Direction เดียวกัน:
       *    รองลงมา
       *
       * Bearing:
       *    ยิ่งใกล้ยิ่งดี
       *
       * Distance:
       *    ใกล้กันยิ่งดี
       */
      let score = 0;

      /**
       * Customer สำคัญที่สุด
       */
      if (sameCustomer) {
        score += 0;
      } else {
        score += 1_000_000;
      }

      /**
       * Direction สำคัญรองลงมา
       */
      if (sameDirection) {
        score += 0;
      } else {
        score += 100_000;
      }

      /**
       * Bearing
       *
       * ถ้าอยู่ใน 35° ถือว่าใกล้
       * แต่ถ้าเกินก็ยังเลือกได้
       */
      if (
        bearingDifference <=
        this.maxBearingDifference
      ) {
        score +=
          bearingDifference *
          100;
      } else {
        /**
         * ไม่ตัดทิ้ง
         *
         * แค่ให้คะแนนตามระยะจริง
         */
        score +=
          bearingDifference *
          200;
      }

      /**
       * Distance เป็นตัวตัดสินท้าย ๆ
       */
      score +=
        distanceDifference *
        10;

      /**
       * Quantity ใช้เป็นตัวตัดสินสุดท้าย
       */
      score +=
        order.quantity;

      /**
       * ป้องกัน unused reference
       */
      if (
        referenceOrder.customer_id ===
        order.customer_id
      ) {
        score -= 1;
      }

      if (
        score <
        bestScore
      ) {
        bestScore =
          score;

        bestIndex =
          i;
      }
    }

    return bestIndex;
  }

  /**
   * ============================================================
   * เติม Order ที่เหลือ
   * ============================================================
   *
   * ใช้เป็น Safety Net
   *
   * ถ้า Work Order ใดยังไม่เต็ม
   * จะพยายามเอา Order ที่เหมาะที่สุดมายัด
   *
   * โดยยังใช้:
   *
   * Customer
   * Direction
   * Bearing
   * Distance
   */
  private distributeRemainingOrders(
    workOrders: WorkOrder[],
    remainingOrders: PlanningOrder[]
  ): void {

    while (
      remainingOrders.length > 0
    ) {

      let placed =
        false;

      /**
       * รอบแรก:
       * เติม Work Order ที่มีอยู่
       */
      for (
        const workOrder
        of workOrders
      ) {

        if (
          workOrder.orders.length >=
          this.maxOrdersPerWorkOrder
        ) {
          continue;
        }

        const index =
          this.findBestOrderIndex(
            workOrder,
            remainingOrders
          );

        if (
          index < 0
        ) {
          continue;
        }

        const [
          order
        ] =
          remainingOrders.splice(
            index,
            1
          );

        workOrder.orders.push(
          order
        );

        this.recalculateWorkOrder(
          workOrder
        );

        placed =
          true;

        /**
         * ใส่ทีละ Order
         * แล้ววนใหม่
         */
        break;
      }

      /**
       * ถ้าไม่มี Work Order ว่าง
       * สร้างใบใหม่
       */
      if (
        !placed &&
        remainingOrders.length > 0
      ) {

        const seed = remainingOrders.shift()!;

        const workOrder =
          this.createWorkOrder([
            seed
          ]);

        while (
          workOrder.orders.length <
            this.maxOrdersPerWorkOrder &&
          remainingOrders.length > 0
        ) {

          const index =
            this.findBestOrderIndex(
              workOrder,
              remainingOrders
            );

          if (
            index < 0
          ) {
            break;
          }

          const [
            order
          ] =
            remainingOrders.splice(
              index,
              1
            );

          workOrder.orders.push(
            order
          );
        }

        this.recalculateWorkOrder(
          workOrder
        );

        workOrders.push(
          workOrder
        );

        placed =
          true;
      }

      if (!placed) {
        break;
      }
    }
  }

  /**
   * ============================================================
   * Circular Bearing Difference
   * ============================================================
   *
   * เช่น:
   *
   * 350° กับ 10°
   *
   * ห่างกันจริง 20°
   * ไม่ใช่ 340°
   */
  private circularAngleDifference(
    angle1: number,
    angle2: number
  ): number {

    const difference =
      Math.abs(
        angle1 -
        angle2
      );

    return Math.min(
      difference,
      360 -
      difference
    );
  }

  /**
   * ============================================================
   * Average Bearing
   * ============================================================
   */
  private calculateAverageBearing(
    orders: PlanningOrder[]
  ): number {

    if (!orders.length) {
      return 0;
    }

    let x = 0;
    let y = 0;

    for (
      const order
      of orders
    ) {

      const radians =
        order.bearing *
        Math.PI /
        180;

      x +=
        Math.cos(radians);

      y +=
        Math.sin(radians);
    }

    let bearing =
      Math.atan2(
        y,
        x
      ) *
      180 /
      Math.PI;

    if (
      bearing < 0
    ) {
      bearing += 360;
    }

    return bearing;
  }

  /**
   * ============================================================
   * Average Distance
   * ============================================================
   */
  private getAverageDistance(
    orders: PlanningOrder[]
  ): number {

    if (!orders.length) {
      return 0;
    }

    return (
      orders.reduce(
        (sum, order) =>
          sum +
          order.distanceFromDepot,
        0
      ) /
      orders.length
    );
  }

  /**
   * ============================================================
   * Create Work Order
   * ============================================================
   */
  private createWorkOrder(
    orders: PlanningOrder[]
  ): WorkOrder {

    return {
      work_order_id:
        crypto.randomUUID(),

      orders:
        [...orders],

      totalQuantity:
        orders.reduce(
          (sum, order) =>
            sum +
            order.quantity,
          0
        ),

      estimatedDistance:
        orders.reduce(
          (sum, order) =>
            sum +
            order.distanceFromDepot,
          0
        )
    };
  }

  /**
   * ============================================================
   * Recalculate Work Order
   * ============================================================
   */
  private recalculateWorkOrder(
    workOrder: WorkOrder
  ): void {

    workOrder.totalQuantity =
      workOrder.orders.reduce(
        (sum, order) =>
          sum +
          order.quantity,
        0
      );

    workOrder.estimatedDistance =
      workOrder.orders.reduce(
        (sum, order) =>
          sum +
          order.distanceFromDepot,
        0
      );
  }
}

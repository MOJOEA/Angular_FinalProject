import { Injectable } from '@angular/core';

import { PlanningOrder } from '../../Model/work';
import { Coordinate } from '../../Model/coordinate';

@Injectable({
  providedIn: 'root',
})
export class DistanceService {
  private readonly earthRadiusKm = 6371;

  calculateDistance(from: Coordinate, to: Coordinate): number {
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const deltaLat = this.toRadians(to.latitude - from.latitude);
    const deltaLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.earthRadiusKm * c;
  }

  // คำนวณหาระยะทางเฉลี่ยจากคลังสินค้าของกลุ่มออเดอร์ในใบงาน
  getAverageDistance(orders: PlanningOrder[]): number {
    return orders.reduce((sum, order) => sum + order.distanceFromDepot, 0) / orders.length;
  }

  private toRadians(degree: number): number {
    return (degree * Math.PI) / 180;
  }
}

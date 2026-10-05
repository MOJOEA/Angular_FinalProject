import { Injectable } from '@angular/core';

import { Coordinate } from '../../Model/coordinate';
import { PlanningOrder } from '../../Model/work';

@Injectable({
  providedIn: 'root'
})
export class BearingService {
  private readonly directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  calculateBearing(from: Coordinate, to: Coordinate): number {
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const deltaLon = this.toRadians(to.longitude - from.longitude);

    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  // หาค่าเฉลี่ยของมุมองศาจากกลุ่มออเดอร์ที่มีอยู่
  calculateAverageBearing(orders: PlanningOrder[]): number {
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

  getDirection(bearing: number): string {
    const index = Math.floor((bearing + 22.5) / 45) % 8;
    return this.directions[index];
  }

  private toRadians(degree: number): number {
    return degree * Math.PI / 180;
  }
}
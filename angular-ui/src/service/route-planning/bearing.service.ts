import { Injectable } from '@angular/core';
import { Coordinate } from './distance.service';

@Injectable({
  providedIn: 'root'
})
export class BearingService {

  /**
   * Calculate bearing from one coordinate to another.
   *
   * Result:
   * 0°   = North
   * 90°  = East
   * 180° = South
   * 270° = West
   */
  calculateBearing(
    from: Coordinate,
    to: Coordinate
  ): number {

    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);

    const deltaLon =
      this.toRadians(
        to.longitude - from.longitude
      );

    const y =
      Math.sin(deltaLon) * Math.cos(lat2);

    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) *
      Math.cos(lat2) *
      Math.cos(deltaLon);

    const bearing =
      Math.atan2(y, x) * 180 / Math.PI;

    return (bearing + 360) % 360;
  }

  /**
   * Convert bearing angle to 8 directions.
   */
  getDirection(bearing: number): string {

    if (bearing >= 337.5 || bearing < 22.5) {
      return 'N';
    }

    if (bearing < 67.5) {
      return 'NE';
    }

    if (bearing < 112.5) {
      return 'E';
    }

    if (bearing < 157.5) {
      return 'SE';
    }

    if (bearing < 202.5) {
      return 'S';
    }

    if (bearing < 247.5) {
      return 'SW';
    }

    if (bearing < 292.5) {
      return 'W';
    }

    return 'NW';
  }

  private toRadians(degree: number): number {
    return degree * Math.PI / 180;
  }
}
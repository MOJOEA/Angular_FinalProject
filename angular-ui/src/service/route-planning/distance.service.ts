import { Injectable } from '@angular/core';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class DistanceService {
  private readonly earthRadiusKm = 6371;

  calculateDistance(from: Coordinate, to: Coordinate): number {
    const lat1 = this.toRadians(from.latitude);
    const lat2 = this.toRadians(to.latitude);
    const deltaLat = this.toRadians(to.latitude - from.latitude);
    const deltaLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.earthRadiusKm * c;
  }

  private toRadians(degree: number): number {
    return degree * Math.PI / 180;
  }
}
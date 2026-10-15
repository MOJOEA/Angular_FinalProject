import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../app/config/api';

import { Coordinate } from '../../Model/coordinate';
import { WorkJob } from '../../Model/work';

@Injectable({
  providedIn: 'root',
})
export class RoutesAMapService {
  private http = inject(HttpClient);
  private api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT_MAP;

  private readonly depot: Coordinate = { latitude: 16.245842, longitude: 103.251458};

  // เรียกใช้ API แผนที่เพื่อค้นหาข้อมูลเส้นทางจากจุดเริ่มต้นไปยังจุดแวะพักต่างๆ
  public getRoute(depot: Coordinate, waypoints: Coordinate[]): Promise<any> {
    let waypointsString = '';
    const len = waypoints.length;
    if (len > 0) {
      waypointsString += `${waypoints[0].longitude},${waypoints[0].latitude}`;
      for (let i = 1; i < len; i++) {
        waypointsString += `;${waypoints[i].longitude},${waypoints[i].latitude}`;
      }
    }
    return lastValueFrom(this.http.get<any>(`${this.apiEndpoint}/${depot.longitude},${depot.latitude};${waypointsString}?overview=full&steps=true&geometries=geojson`));
  }

  // คำนวณและดึงข้อมูลเส้นทาง ระยะทาง และเวลาสำหรับใบงานเดี่ยวใบเดียว
  public async getRouteForSingleWork(work: WorkJob): Promise<WorkJob> {
    const stops = work.stops;
    if (!stops || stops.length === 0) {
      return { 
        ...work, 
        geometry: null, 
        distance_raw: 0,
        duration_raw: 0,
        distance_km: 0,
        duration_min: 0
      };
    }

    try {
      const routeResponse = await this.getRoute(this.depot, stops);
      const primaryRoute = routeResponse?.routes?.[0];
      const distanceMetres = primaryRoute ? primaryRoute.distance : 0;
      const durationSeconds = primaryRoute ? primaryRoute.duration : 0;
    
      return {
        ...work,
        geometry: primaryRoute?.geometry || null,
        distance_raw: distanceMetres,
        duration_raw: durationSeconds,
        distance_km: distanceMetres * 0.001,
        duration_min: (distanceMetres * 0.12) / 60
      };

    } catch (error) {
      return { 
        ...work, 
        geometry: null, 
        distance_raw: undefined,
        duration_raw: undefined,
        distance_km: undefined,
        duration_min: undefined
      };
    }
  }

  // คำนวณและดึงข้อมูลเส้นทางพร้อมกันทีละหลายใบงานในรูปแบบขนาน
  public getRoutesForMultipleWorks(works: WorkJob[]): Promise<WorkJob[]> {
    const len = works.length;
    const promises = new Array(len);
    for (let i = 0; i < len; i++) {
      promises[i] = this.getRouteForSingleWork(works[i]);
    }
    return Promise.all(promises);
  }
}

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../app/config/api';

import { SettingService } from './setting';
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
  public async getRoute(depot: Coordinate, waypoints: Coordinate[]): Promise<any> {
    const waypointsString = waypoints.map(wp => `${wp.longitude},${wp.latitude}`).join(';');
    const url = `${this.apiEndpoint}/${depot.longitude},${depot.latitude};${waypointsString}?overview=full&steps=true&geometries=geojson`;
    try {
      const response = await lastValueFrom(this.http.get<any>(url));
      return response;
    } catch (error) {
      throw error;
    }
  }

  // คำนวณและดึงข้อมูลเส้นทาง ระยะทาง และเวลาสำหรับใบงานเดี่ยวใบเดียว
  public async getRouteForSingleWork(work: WorkJob): Promise<WorkJob> {
    if (!work.stops || work.stops.length === 0) {
      return { 
        ...work, 
        geometry: null, 
        distance: '0.00 km', 
        duration: '0 mins' 
      };
    }

    const waypoints: Coordinate[] = work.stops.map((stop) => ({latitude: stop.latitude, longitude: stop.longitude,}));
    try {
      const routeResponse = await this.getRoute(this.depot, waypoints);
      const primaryRoute = routeResponse?.routes?.[0];
    
      const resultWork: WorkJob = {
        ...work,
        geometry: primaryRoute?.geometry || null,
        distance: primaryRoute ? (primaryRoute.distance / 1000).toFixed(2) + ' km' : '0.00 km',
        duration: primaryRoute ? (primaryRoute.duration / 60).toFixed(0) + ' mins' : '0 mins'
      };
      return resultWork;

    } catch (error) {
      return { 
        ...work, 
        geometry: null, 
        distance: 'Error', 
        duration: 'Error' 
      };
    }
  }

  // คำนวณและดึงข้อมูลเส้นทางพร้อมกันทีละหลายใบงานในรูปแบบขนาน
  public async getRoutesForMultipleWorks(works: WorkJob[]): Promise<WorkJob[]> {
    const routePromises = works.map((work) => this.getRouteForSingleWork(work));
    const finalResults = await Promise.all(routePromises);
    return finalResults;
  }
}

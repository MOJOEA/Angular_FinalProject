import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, from } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
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
  private readonly depot: Coordinate = { latitude: 16.245842, longitude: 103.251458 };

  // ฟังก์ชัน: เรียก API เพื่อคำนวณเส้นทางจากคลังสินค้าไปยังจุดส่ง
  public getRoute(depot: Coordinate, waypoints: Coordinate[]): Promise<any> {
    let waypointsString = '';
    if (waypoints.length > 0) {
      waypointsString += `${waypoints[0].longitude},${waypoints[0].latitude}`;
      for (let i = 1; i < waypoints.length; i++) {
        waypointsString += `;${waypoints[i].longitude},${waypoints[i].latitude}`;
      }
    }
    return lastValueFrom(this.http.get<any>(`${this.apiEndpoint}/${depot.longitude},${depot.latitude};${waypointsString}?overview=full&steps=true&geometries=geojson`));
  }

  // ฟังก์ชัน: คำนวณเส้นทาง ระยะทาง และเวลาของใบงานเดี่ยว
  public async getRouteForSingleWork(work: WorkJob): Promise<WorkJob> {
    const stops = work.stops;
    if (!stops || stops.length === 0) {
      return { ...work, geometry: null, distance_raw: 0, duration_raw: 0, distance_km: 0, duration_min: 0 };
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
      return { ...work, geometry: null, distance_raw: undefined, duration_raw: undefined, distance_km: undefined, duration_min: undefined };
    }
  }

  // ฟังก์ชัน: คำนวณเส้นทางหลายใบงานพร้อมจำกัดจำนวนคำขอและใช้ผลลัพธ์ซ้ำ
  private cacheMap = new Map<string, any>(); 

public async getRoutesForMultipleWorks(works: WorkJob[]): Promise<WorkJob[]> {
  if (!works || works.length === 0) return [];
  
  const results: WorkJob[] = [];
  const pendingRequests: { work: WorkJob; cacheKey: string }[] = [];

  for (const work of works) {
    if (!work.stops || work.stops.length === 0) {
      results.push({ ...work, geometry: null, distance_raw: 0, duration_raw: 0, distance_km: 0, duration_min: 0 });
      continue;
    }

    const cacheKey = work.stops.map(s => `${s.latitude},${s.longitude}`).join('|');
    
    if (this.cacheMap.has(cacheKey)) {
      const cached = this.cacheMap.get(cacheKey);
      results.push({ ...work, ...cached });
    } else {
      pendingRequests.push({ work, cacheKey });
      results.push(work);
    }
  }
  if (pendingRequests.length > 0) {
    const CONCURRENT_LIMIT = 6;

    for (let i = 0; i < pendingRequests.length; i += CONCURRENT_LIMIT) {
      const chunk = pendingRequests.slice(i, i + CONCURRENT_LIMIT);
      
      await Promise.all(chunk.map(async (req) => {
        const updatedWork = await this.getRouteForSingleWork(req.work);
        const routeData = {
          geometry: updatedWork.geometry,
          distance_raw: updatedWork.distance_raw,
          duration_raw: updatedWork.duration_raw,
          distance_km: updatedWork.distance_km,
          duration_min: updatedWork.duration_min
        }; 
        this.cacheMap.set(req.cacheKey, routeData);
      }));
    }
    return works.map(work => {
      if (!work.stops || work.stops.length === 0) return work;
      const cacheKey = work.stops.map(s => `${s.latitude},${s.longitude}`).join('|');
      const cachedData = this.cacheMap.get(cacheKey);
      return cachedData ? { ...work, ...cachedData } : work;
    });
  }

  return results;
}}
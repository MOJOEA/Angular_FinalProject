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

  private readonly depot: Coordinate = { latitude: 16.245842, longitude: 103.251458};

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

  // คำนวณใบงานเดี่ยว
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

  public async getRoutesForMultipleWorks(works: WorkJob[]): Promise<WorkJob[]> {
    if (!works || works.length === 0) return [];
    const cacheMap = new Map<string, Promise<WorkJob>>();
    const results: WorkJob[] = [];
    const pendingWorks: WorkJob[] = [];
    for (const work of works) {
      if (!work.stops || work.stops.length === 0) {
        results.push({
          ...work,
          geometry: null,
          distance_raw: 0,
          duration_raw: 0,
          distance_km: 0,
          duration_min: 0
        });
      } else {
        const cacheKey = work.stops.map(s => `${s.latitude},${s.longitude}`).join('|');
        if (cacheMap.has(cacheKey)) {
          results.push({ ...work, _cacheKey: cacheKey } as any);
        } else {
          pendingWorks.push(work);
          results.push(work); // ใส่ไว้เป็น reference ก่อน
        }
      }
    }

    if (pendingWorks.length > 0) {
      const CONCURRENT_LIMIT = 6;
      const uniqueResults = await lastValueFrom(
        from(pendingWorks).pipe(
          mergeMap((work) => this.getRouteForSingleWork(work), CONCURRENT_LIMIT),
          toArray()
        )
      );

      for (let i = 0; i < pendingWorks.length; i++) {
        const originalWork = pendingWorks[i];
        const cacheKey = originalWork.stops!.map(s => `${s.latitude},${s.longitude}`).join('|');
        cacheMap.set(cacheKey, Promise.resolve(uniqueResults[i]));
      }
    }

    const finalResults = await Promise.all(
      results.map(async (work: any) => {
        if (work._cacheKey) {
          const cachedData = await cacheMap.get(work._cacheKey);
          return {
            ...work,
            geometry: cachedData?.geometry,
            distance_raw: cachedData?.distance_raw,
            duration_raw: cachedData?.duration_raw,
            distance_km: cachedData?.distance_km,
            duration_min: cachedData?.duration_min
          };
        }
        if (work.stops && work.stops.length > 0) {
          const cacheKey = work.stops.map((s: any) => `${s.latitude},${s.longitude}`).join('|');
          return cacheMap.get(cacheKey) || work;
        }
        return work;
      })
    );

    return finalResults;
  }
}

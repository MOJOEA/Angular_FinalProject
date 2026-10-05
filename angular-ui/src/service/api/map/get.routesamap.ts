import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../../app/config/api';

import { Coordinate } from '../../../Model/coordinate';

@Injectable({
  providedIn: 'root',
})
export class RoutesAMapService {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT_MAP;

  // Database funtions
  public async getRoute(depot: Coordinate, waypoints: Coordinate[]): Promise<any> {
    const url = `${this.apiEndpoint}/${depot.longitude},${depot.latitude};${waypoints.map((wp) => `${wp.longitude},${wp.latitude}`).join(';')}?overview=full&steps=true&geometries=geojson`;
    const response = await lastValueFrom(this.http.get(url));
    return response as any;
  }
}

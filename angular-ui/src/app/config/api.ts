import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Api {
  public readonly API_ENDPOINT_BACKING: string = 'http://localhost:3000';
  public readonly API_ENDPOINT_MAP: string = 'https://router.project-osrm.org/route/v1/driving';
}
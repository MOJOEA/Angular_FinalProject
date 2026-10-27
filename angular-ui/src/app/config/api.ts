import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Api {
  public readonly API_ENDPOINT_BACKING: string = 'https://angular-final-project-backend.vercel.app';
  public readonly API_ENDPOINT_MAP: string = 'https://router.project-osrm.org/route/v1/driving';
}
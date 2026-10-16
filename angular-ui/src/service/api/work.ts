import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Api } from '../../app/config/api';
import { WorkJob } from '../../Model/work';

@Injectable({
  providedIn: 'root',
})
export class WorkService {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT_BACKING;

  public getAllWork(): Observable<{ success: boolean; data: WorkJob[] }> {
    return this.http.get<{ success: boolean; data: WorkJob[] }>(`${this.apiEndpoint}/api/work`);
  }

  public getWorkCreat(): Observable<{ success: boolean; data: WorkJob[] }> {
    return this.http.get<{ success: boolean; data: WorkJob[] }>(`${this.apiEndpoint}/api/work/creat`);
  }

  public getWork(id: number): Observable<{ success: boolean; data: WorkJob }> {
    return this.http.get<{ success: boolean; data: WorkJob }>(`${this.apiEndpoint}/api/work/${id}`);
  }
}

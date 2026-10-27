import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../app/config/api';
import { WorkJob } from '../../Model/work';

@Injectable({
  providedIn: 'root',
})
export class WorkService {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT_BACKING;

  // GET api/work
  public async getAllWork(): Promise<{ success: boolean; data: WorkJob[] }> {
    const url = `${this.apiEndpoint}/api/work`;
    return await lastValueFrom(this.http.get<{ success: boolean; data: WorkJob[] }>(url));
  }

  // GET api/work/creat
  public async getWorkCreat(): Promise<{ success: boolean; data: WorkJob[] }> {
    const url = `${this.apiEndpoint}/api/work/creat`;
    return await lastValueFrom(this.http.get<{ success: boolean; data: WorkJob[] }>(url));
  }

  // GET api/work/:id
  public async getWork(id: number): Promise<{ success: boolean; data: WorkJob }> {
    const url = `${this.apiEndpoint}/api/work/${id}`;
    return await lastValueFrom(this.http.get<{ success: boolean; data: WorkJob }>(url));
  }

  // PUT api/work/accept/:id
  public async acceptWork(id: number): Promise<{ success: boolean; message: string }> {
    const url = `${this.apiEndpoint}/api/work/accept/${id}`;
    return await lastValueFrom(this.http.put<{ success: boolean; message: string }>(url, {}));
  }

  // PUT api/work/logout/:id
  public async logoutWork(id: number): Promise<void> {
    const url = `${this.apiEndpoint}/api/work/logout/${id}`;
    await lastValueFrom(this.http.put<void>(url, {}));
  }
}

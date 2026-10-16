import { inject, Injectable } from '@angular/core';

import { Api } from '../../app/config/api';

import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { WorkJob } from '../../Model/work';

@Injectable({
  providedIn: 'root',
})
export class WorkService {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT_BACKING;

  // GET api/work/
  public async getAllWork(): Promise<any> {
    const url = `${this.apiEndpoint}/api/work`;
    const response = (await lastValueFrom(this.http.get(url))) as { success: boolean; data: WorkJob[]; };
    return response;
  }

  // GET api/work/creat
  public async getWorkCreat(): Promise<any> {
    const url = `${this.apiEndpoint}/api/work/creat`;
    const response = (await lastValueFrom(this.http.get(url))) as { success: boolean; data: WorkJob[]; };
    return response;
  }

  // GET api/work/:id
  public async getWork(id: number): Promise<any> {
    const url = `${this.apiEndpoint}/api/work/${id}`;
    const response = (await lastValueFrom(this.http.get(url))) as { success: boolean; data: WorkJob; };
    return response;
  }

  // POST api/work/accept/:id
  public async acceptWork(id: number): Promise<void> {
    const url = `${this.apiEndpoint}/api/work/accept/${id}`;
    await lastValueFrom(this.http.post<void>(url, {}));
  }

  // POST api/work/logout/:id
  public async logoutWork(id: number): Promise<void> {
    const url = `${this.apiEndpoint}/api/work/logout/${id}`;
    await lastValueFrom(this.http.post<void>(url, {}));
  }
}

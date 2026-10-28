
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../app/config/api';
import { SystemSetting } from '../../Model/setting';

@Injectable({
  providedIn: 'root'
})
export class SettingService {
  private http = inject(HttpClient);
  private api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT_BACKING;

  public get(): Promise<{ data: SystemSetting }> {
    const url = `${this.apiEndpoint}/api/setting`;
    return lastValueFrom(
      this.http.get<{ data: SystemSetting }>(url)
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { SystemSetting } from '../../Model/setting';

@Injectable({
  providedIn: 'root'
})
export class SettingService {

  private readonly url = 'assets/settings.json';
  constructor(private http: HttpClient) {}

  // ดึงข้อมูลการตั้งค่าระบบทั้งหมดจากไฟล์จำลอง JSON
  get(): Observable<SystemSetting[]> {
    return this.http.get<SystemSetting[]>(this.url);
  }
}

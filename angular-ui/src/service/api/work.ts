import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ApiResponse } from '../../Model/work';


@Injectable({
  providedIn: 'root'
})
export class WorkService {

  private readonly works = 'assets/works.json';
  private readonly work = 'assets/work.json';

  constructor(private http: HttpClient) {}

  // ดึงข้อมูลกลุ่มใบงานทั้งหมดจากไฟล์จำลอง JSON
  getAll(): Observable<ApiResponse> {
      return this.http.get<ApiResponse>(this.works);
  }

  // ดึงข้อมูลใบงานเดี่ยวจากไฟล์จำลอง JSON
  get(): Observable<ApiResponse> {
      return this.http.get<ApiResponse>(this.work);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { SystemSetting } from '../../../Model/setting';

@Injectable({
  providedIn: 'root'
})
export class GetAllOrderService {

  private readonly url = 'assets/settings.json';

  constructor(private http: HttpClient) {}
  getAll(): Observable<SystemSetting[]> {
    return this.http.get<SystemSetting[]>(this.url);
  }
}
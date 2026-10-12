import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { Order } from '../../Model/order';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private readonly url = 'assets/orders.json';
  constructor(private http: HttpClient) {}

  // ดึงข้อมูลออเดอร์ทั้งหมดจากไฟล์จำลอง JSON
  getAll(): Observable<Order[]> {
    return this.http.get<Order[]>(this.url);
  }

  // ค้นหาและดึงข้อมูลออเดอร์เฉพาะรายการด้วยรหัสไอดี
  getById(orderId: number): Observable<Order | undefined> {
    return this.getAll().pipe(map(orders => orders.find(order => order.order_id === orderId)));
  }
}

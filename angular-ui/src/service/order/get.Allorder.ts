import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Order } from '../../Model/order';

@Injectable({
  providedIn: 'root'
})
export class GetAllOrderService {

  private readonly url = 'assets/orders.json';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Order[]> {
    return this.http.get<Order[]>(this.url);
  }
}
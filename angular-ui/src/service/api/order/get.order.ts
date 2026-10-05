import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Order } from '../../../Model/order';
import { GetAllOrderService } from './get.Allorder';

@Injectable({
  providedIn: 'root'
})
export class GetOrderService {

  constructor(
    private getAllOrderService: GetAllOrderService
  ) {}

  getById(orderId: number): Observable<Order | undefined> {

    return this.getAllOrderService.getAll().pipe(
      map(orders =>
        orders.find(
          order => order.order_id === orderId
        )
      )
    );
  }
}
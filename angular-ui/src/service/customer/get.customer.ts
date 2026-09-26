import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { Customer } from '../../Model/customer';
import { GetAllCustomerService } from './get.Allcustomer';

@Injectable({
  providedIn: 'root'
})
export class GetCustomerService {

  constructor(
    private getAllCustomerService: GetAllCustomerService
  ) {}

  getById(customerId: number): Observable<Customer | undefined> {

    return this.getAllCustomerService.getAll().pipe(
      map(customers =>
        customers.find(
          customer => customer.customer_id === customerId
        )
      )
    );
  }
}
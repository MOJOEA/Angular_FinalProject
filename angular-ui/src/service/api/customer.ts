import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { Customer } from '../../Model/customer';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

  private readonly url = 'assets/customers.json';
  constructor(private http: HttpClient) {}

  // ดึงข้อมูลลูกค้าทั้งหมดจากไฟล์จำลอง JSON
  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.url);
  }

  // ค้นหาและดึงข้อมูลลูกค้าเฉพาะรายด้วยรหัสไอดี
  getById(customerId: number): Observable<Customer | undefined> {
    return this.getAll().pipe(map(customers => customers.find( customer => customer.customer_id === customerId )));
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Customer } from '../../Model/customer';

@Injectable({
  providedIn: 'root'
})
export class GetAllCustomerService {

  private readonly url = 'assets/customers.json';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.url);
  }
}
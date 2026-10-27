import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { Api } from '../../app/config/api';
import { Customer } from '../../Model/customer';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  http = inject(HttpClient);
  api = inject(Api);
  apiEndpoint = this.api.API_ENDPOINT_BACKING;

  public async getAllCustomers(params?: { name?: string; limit?: number; lat?: number; lng?: number }): Promise<Customer[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.name) httpParams = httpParams.set('name', params.name);
      if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
      if (params.lat !== undefined && params.lng !== undefined) {
        httpParams = httpParams.set('lat', params.lat.toString());
        httpParams = httpParams.set('lng', params.lng.toString());
      }
    }

    const url = `${this.apiEndpoint}/api/customer`;
    const response = await lastValueFrom(this.http.get(url, { params: httpParams }));
    return response as Customer[];
  }

  public async getCustomerById(id: number | string): Promise<Customer | undefined> {
    const url = `${this.apiEndpoint}/api/customer/${id}`;
    const response = await lastValueFrom(this.http.get(url));
    return response as Customer | undefined;
  }

  public async createCustomer(customerData: {
    customer_name: string;
    phone_number: string;
    location_name: string;
    latitude: number;
    longitude: number;
  }): Promise<Customer> {
    const url = `${this.apiEndpoint}/api/customer`;
    const response = await lastValueFrom(this.http.post(url, customerData));
    return response as Customer;
  }

  public async updateCustomer(id: number | string, customerData: {
    customer_name: string;
    phone_number: string;
    location_name: string;
    latitude: number;
    longitude: number;
  }): Promise<Customer> {
    const url = `${this.apiEndpoint}/api/customer/${id}`;
    const response = await lastValueFrom(this.http.put(url, customerData));
    return response as Customer;
  }

  public async deleteCustomer(id: number | string): Promise<any> {
    const url = `${this.apiEndpoint}/api/customer/${id}`;
    const response = await lastValueFrom(this.http.delete(url));
    return response;
  }
}
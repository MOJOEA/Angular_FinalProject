import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Api } from '../../app/config/api';
import { Order } from '../../Model/order';

export type OrderPayload = Pick<Order, 'customer_id' | 'box_count' | 'order_note'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOrder(value: unknown): value is Order {
  return isRecord(value)
    && typeof value['order_id'] === 'number'
    && typeof value['customer_id'] === 'number'
    && typeof value['box_count'] === 'number'
    && typeof value['order_note'] === 'string'
    && (value['status'] === 'pending'
      || value['status'] === 'delivered'
      || value['status'] === 'cancelled')
    && typeof value['created_at'] === 'string'
    && typeof value['updated_at'] === 'string';
}

function extractOrders(response: unknown): Order[] {
  if (isRecord(response) && response['success'] === false) {
    throw new Error('API แจ้งว่าโหลดข้อมูลออเดอร์ไม่สำเร็จ');
  }

  const data = Array.isArray(response)
    ? response
    : isRecord(response) && Array.isArray(response['orders'])
      ? response['orders']
    : isRecord(response) && Array.isArray(response['data'])
      ? response['data']
        : null;

  if (!data || !data.every(isOrder)) {
    throw new Error('รูปแบบข้อมูลออเดอร์จาก API ไม่ถูกต้อง');
  }
  return data;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(Api);
  private readonly url = `${this.api.API_ENDPOINT_BACKING}/api/order`;

  public async getAll(): Promise<Order[]> {
    const response: unknown = await lastValueFrom(this.http.get<unknown>(this.url));
    return extractOrders(response);
  }

  public async getById(orderId: number): Promise<Order | undefined> {
    const orders = await this.getAll();
    return orders.find((order) => order.order_id === orderId);
  }

  public async createOrder(order: OrderPayload): Promise<unknown> {
    return this.assertSuccess(await lastValueFrom(this.http.post<unknown>(this.url, order)));
  }

  public async updateOrder(orderId: number, order: OrderPayload): Promise<unknown> {
    return this.assertSuccess(await lastValueFrom(this.http.put<unknown>(`${this.url}/${orderId}`, order)));
  }

  public async deleteOrder(orderId: number): Promise<unknown> {
    return this.assertSuccess(await lastValueFrom(this.http.delete<unknown>(`${this.url}/${orderId}`)));
  }

  private assertSuccess(response: unknown): unknown {
    if (isRecord(response) && response['success'] === false) {
      throw new Error(typeof response['message'] === 'string'
        ? response['message']
        : 'API แจ้งว่าบันทึกออเดอร์ไม่สำเร็จ');
    }
    return response;
  }
}

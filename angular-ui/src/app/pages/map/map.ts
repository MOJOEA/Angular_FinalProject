import { Component, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { GetAllOrderService } from '../../../service/api/order/get.Allorder';
import { GetAllCustomerService } from '../../../service/api/customer/get.Allcustomer';
import { WorkOrderService } from '../../../service/route-planning/work-order.service';

import { Customer } from '../../../Model/customer';
import { Order } from '../../../Model/order';
import { WorkOrder } from '../../../Model/work';

import { MapManagementComponent } from '../../components/map-management/map-management';
import { MapViewComponent } from '../../components/map-view/map-view';
@Component({
  selector: 'app-map',
  standalone: true,
  imports: [MapManagementComponent, MapViewComponent],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements OnInit {
  depot = { latitude: 16.2443, longitude: 103.2502 };
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  orders = signal<Order[]>([]);
  customers = signal<Customer[]>([]);
  workOrders = signal<WorkOrder[]>([]);
  constructor(
    private orderService: GetAllOrderService,
    private customerService: GetAllCustomerService,
    private workOrderService: WorkOrderService,
  ) {}
  // เปิดหน้าเว็บยังไม่โหลดข้อมูลจนกว่าจะกดปุ่ม
  async ngOnInit(): Promise<void> {
    this.fetchOrders();
    this.fetchCustomers();
  }
  async fetchOrders(): Promise<void> {
    const res = await firstValueFrom(this.orderService.getAll());
    this.orders.set(res);
  }
  async fetchCustomers(): Promise<void> {
    const res = await firstValueFrom(this.customerService.getAll());
    this.customers.set(res);
  }
  async generateWorkOrders(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      const result = await this.workOrderService.createWorkOrders(this.orders(), this.customers(), this.depot);
      this.workOrders.set(result);
    } catch (error) {
      this.errorMessage.set('เกิดข้อผิดพลาดในการสร้างใบงาน');
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }
  clearWorkOrders(): void {
    this.workOrders.set([]);
    this.orders.set([]);
    this.customers.set([]);
  }
  saveWorkOrders(): void {
    if (this.workOrders().length === 0) return;
    console.log('บันทึกข้อมูล Work Orders:', this.workOrders());
  }
}

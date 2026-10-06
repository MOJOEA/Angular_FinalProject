import { Component, OnInit, signal, viewChild } from '@angular/core'; // 🌟 ดึง viewChild เข้ามา
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
  readonly mapView = viewChild<MapViewComponent>('mapView');

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
      this.fetchCustomers();
      this.fetchOrders();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await this.workOrderService.createWorkOrders(this.orders(), this.customers(), this.depot);
      this.workOrders.set(result);
      this.mapView()?.drawAllRoutes(result);

    } catch (error) {
      this.errorMessage.set('เกิดข้อผิดพลาดในการสร้างใบงาน');
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }

  selectOrderOnMap(work_order_id: string): void {
    const workOrder = this.workOrders().find((wo) => wo.work_order_id === work_order_id);
    if (workOrder) { this.mapView()?.drawSingleRoute(workOrder);}
  }

  showAllOrdersOnMap(): void {
    this.mapView()?.drawAllRoutes(this.workOrders());
  }

  clearWorkOrders(): void {
    this.workOrders.set([]);
    this.orders.set([]);
    this.customers.set([]);
    this.mapView()?.clearRoutes();
  }

  saveWorkOrders(): void {
    if (this.workOrders().length === 0) return;
    console.log('บันทึกข้อมูล Work Orders:', this.workOrders());
  }
}
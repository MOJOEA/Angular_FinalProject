import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';

import { GetAllOrderService } from '../../../service/api/order/get.Allorder';
import { GetAllCustomerService } from '../../../service/api/customer/get.Allcustomer';
import { WorkOrderService } from '../../../service/route-planning/work-order.service';

import { WorkOrder } from '../../../Model/work';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './main.html',
  styleUrl: './main.css'
})
export class Main implements OnInit {
  workOrders = signal<WorkOrder[]>([]);
  depot = { latitude: 16.2443, longitude: 103.2502 };
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  constructor(
    private orderService: GetAllOrderService,
    private customerService: GetAllCustomerService,
    private workOrderService: WorkOrderService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.generateWorkOrders();
  }

  generateWorkOrders(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    // ใช้ forkJoin เพื่อยิง API ทั้งสองตัวพร้อมกัน ขจัดปัญหาสายเคเบิลซ้อน (Callback Hell)
    forkJoin({
      orders: this.orderService.getAll(),
      customers: this.customerService.getAll()
    }).subscribe({
      next: ({ orders, customers }) => {
        this.workOrderService.createWorkOrders(orders, customers, this.depot)
          .then(workOrders => {
            this.workOrders.set(workOrders);
            this.loading.set(false);
            this.cdr.detectChanges();
          })
          .catch(error => {
            console.error('เกิดข้อผิดพลาดในการสร้าง Work Orders:', error);
            this.errorMessage.set(`สร้าง Work Orders ไม่สำเร็จ (${error?.message || 'Unknown Error'})`);
            this.loading.set(false);
            this.cdr.detectChanges();
          });
      },
      error: error => {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
        this.errorMessage.set(`โหลดข้อมูลไม่สำเร็จ (${error.status || 'Unknown Error'})`);
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  regenerate(): void {
    this.generateWorkOrders();
  }
}
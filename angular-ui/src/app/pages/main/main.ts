import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { GetAllOrderService } from '../../../service/order/get.Allorder';
import { GetAllCustomerService } from '../../../service/customer/get.Allcustomer';

import {
  WorkOrderService,
  WorkOrder
} from '../../../service/route-planning/work-order.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    DecimalPipe
  ],
  templateUrl: './main.html',
  styleUrl: './main.css'
})
export class Main implements OnInit {

  workOrders: WorkOrder[] = [];

  depot = {
    latitude: 13.7563,
    longitude: 100.5018
  };

  loading = false;
  errorMessage = '';

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
    this.loading = true;
    this.errorMessage = '';

    console.log('เริ่มสร้าง Work Orders...');

    this.orderService.getAll().subscribe({
      next: orders => {

        console.log('Orders:', orders.length);

        this.customerService.getAll().subscribe({
          next: customers => {

            console.log('Customers:', customers.length);

            this.workOrders =
              this.workOrderService.createWorkOrders(
                orders,
                customers,
                this.depot
              );

            console.log(
              '===== WORK ORDERS ====='
            );

            console.log(
              'จำนวน Work Orders:',
              this.workOrders.length
            );

            console.log(
              this.workOrders
            );

            // โหลดเสร็จแล้ว
            this.loading = false;

            console.log(
              'loading =',
              this.loading
            );

            // บังคับให้ UI ตรวจสอบค่าใหม่
            this.cdr.detectChanges();
          },

          error: error => {

            console.error(
              'โหลด Customers ไม่สำเร็จ:',
              error
            );

            this.errorMessage =
              `โหลด Customers ไม่สำเร็จ (${error.status})`;

            this.loading = false;

            this.cdr.detectChanges();
          }
        });
      },

      error: error => {

        console.error(
          'โหลด Orders ไม่สำเร็จ:',
          error
        );

        this.errorMessage =
          `โหลด Orders ไม่สำเร็จ (${error.status})`;

        this.loading = false;

        this.cdr.detectChanges();
      }
    });
  }

  regenerate(): void {
    this.generateWorkOrders();
  }
}
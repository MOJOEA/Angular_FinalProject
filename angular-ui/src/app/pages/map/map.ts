import { Component, OnInit, AfterViewInit, signal, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import * as L from 'leaflet';

import { GetAllOrderService } from '../../../service/api/order/get.Allorder';
import { GetAllCustomerService } from '../../../service/api/customer/get.Allcustomer';
import { WorkOrderService } from '../../../service/route-planning/work-order.service';

import { getRandomColor } from '../../../Util/random/randomColor';

import { Customer } from '../../../Model/customer';
import { Order } from '../../../Model/order';
import { WorkOrder } from '../../../Model/work';

const MAP_CONFIG = {
  // 1. ตั้งค่าเริ่มต้นตอนเปิดหน้าเว็บครั้งแรก
  initCenter: [16.2443, 103.2502] as L.LatLngExpression,
  initZoom: 15,

  // 2. ตั้งค่าภาพพื้นหลังแผนที่
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxZoom: 19,

  // 3. ปรับแต่งสไตล์ของเส้นทาง
  lineWidth: 6,
  lineOpacity: 0.85,
};
// =========================================================================

@Component({
  selector: 'app-map',
  imports: [DecimalPipe],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements OnInit, AfterViewInit {
  depot = { latitude: 16.2443, longitude: 103.2502 };

  loading = signal<boolean>(false);
  errorMessage = signal<string>('');

  orders = signal<Order[]>([]);
  customers = signal<Customer[]>([]);
  workOrders = signal<WorkOrder[]>([]);

  private map!: L.Map;

  // สำหรับควบคุมเลเยอร์เส้นและหมุดแอนิเมชัน
  private routePolylines: L.Polyline[] = [];

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

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.buildNewMap(MAP_CONFIG.initCenter, MAP_CONFIG.initZoom);
    }, 300);
  }

  async fetchOrders(): Promise<void> {
    const res = await firstValueFrom(this.orderService.getAll());
    this.orders.set(res);
  }

  async fetchCustomers(): Promise<void> {
    const res = await firstValueFrom(this.customerService.getAll());
    this.customers.set(res);
  }

  searchCustomerName(customer_id: number): string {
    const customer = this.customers().find((c) => c.customer_id === customer_id);
    return customer ? customer.name : 'ไม่พบลูกค้า';
  }

  async generateWorkOrders(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      if (this.orders().length === 0 || this.customers().length === 0) {
        await Promise.all([this.fetchOrders(), this.fetchCustomers()]);
      }
      const result = await this.workOrderService.createWorkOrders(this.orders(), this.customers(), this.depot);
      this.workOrders.set(result);
      this.drawAllRoutes();
    } catch (error) {
      this.errorMessage.set('เกิดข้อผิดพลาดในการสร้างใบงาน');
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }

  // ฟังก์ชันสลายและสร้างแผนที่ใหม่ เพื่อแก้ปัญหาสัดส่วน Canvas บิดเบี้ยว
  private buildNewMap(center: L.LatLngExpression, zoom: number): void {
    if (this.map) {
      this.map.off();
      this.map.remove();
    }

    this.map = L.map('map-container').setView(center, zoom);

    L.tileLayer(MAP_CONFIG.tileLayerUrl, {
      maxZoom: MAP_CONFIG.maxZoom,
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.map.invalidateSize();
  }

  // ล้างเส้นทางและหมุดเดิม
  private clearRoutes(): void {
    this.routePolylines.forEach((route) => this.map.removeLayer(route));
    this.routePolylines = [];
  }

  // วาดเส้นทางของ Work Order ทั้งหมดพร้อมกัน
  private drawAllRoutes(): void {
    this.clearRoutes();

    const allPoints: L.LatLngExpression[] = [];

    this.workOrders().forEach((workOrder) => {
      // ใช้ routeCoordinates จาก WorkOrder เป็นข้อมูลเส้นทาง
      const coords = workOrder.routeCoordinates;

      if (!coords || coords.length === 0) return;

      const lineColor = getRandomColor();
      const correctedCoords = coords.map((coord: [number, number]) => [coord[1], coord[0]] as L.LatLngExpression);

      const polyline = L.polyline(correctedCoords, {
        color: lineColor,
        weight: MAP_CONFIG.lineWidth,
        opacity: MAP_CONFIG.lineOpacity,
      }).addTo(this.map);

      this.routePolylines.push(polyline);
      allPoints.push(...correctedCoords);

    });

    if (allPoints.length > 0) {
      this.map.fitBounds(L.latLngBounds(allPoints), {
        padding: [30, 30],
      });
    }
  }


  clearWorkOrders(): void {
    this.workOrders.set([]);
    this.orders.set([]);
    this.customers.set([]);
    this.clearRoutes();
  }

  saveWorkOrders(): void {
    if (this.workOrders().length === 0) return;
    console.log('บันทึกข้อมูล Work Orders:', this.workOrders());
  }
}

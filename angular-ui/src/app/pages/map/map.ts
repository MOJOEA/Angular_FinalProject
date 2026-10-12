import { Component, OnInit, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { WorkService } from '../../../service/api/work'; 
import { RoutesAMapService } from '../../../service/api/routesamap'; 
import { WorkJob } from '../../../Model/work';

import { MapViewComponent } from '../../components/map-view/map-view';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [MapViewComponent],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements OnInit {
  readonly mapView = viewChild<MapViewComponent>('mapView');

  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  
  workOrders = signal<WorkJob[]>([]);
  
  constructor(
    private workService: WorkService, 
    private routesAMapService: RoutesAMapService 
  ) {}

  // โหลดข้อมูลและแสดงเส้นทางบนแผนที่ทันทีเมื่อเปิดหน้าจอ
  async ngOnInit(): Promise<void> {
  }

  // ดึงข้อมูลใบงาน พ่วงพิกัดเส้นทางจาก API และส่งไปวาดบนแผนที่ทั้งหมด
  async generateWorkOrders(): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    
    try {
      const res = await firstValueFrom(this.workService.getAll());
      const mockWorks: WorkJob[] = res?.data || [];

      if (mockWorks.length === 0) {
        this.errorMessage.set('ไม่พบข้อมูลใบงานจำลองในระบบ');
        return;
      }

      const worksWithRoutes = await this.routesAMapService.getRoutesForMultipleWorks(mockWorks);
      
      this.workOrders.set(worksWithRoutes);
      this.mapView()?.drawAllRoutes(worksWithRoutes);

    } catch (error) {
      this.errorMessage.set('เกิดข้อผิดพลาดในการดึงและสร้างเส้นทางใบงาน');
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }

  // ค้นหาและแสดงเส้นทางบนแผนที่เฉพาะใบงานเดี่ยวที่เลือก
  selectOrderOnMap(job_code: string): void {
    const workOrder = this.workOrders().find((wo) => wo.job_code === job_code);
    if (workOrder) { 
      this.mapView()?.drawSingleRoute(workOrder);
    }
  }

  // สั่งให้แผนที่แสดงเส้นทางของทุกใบงานพร้อมกันทั้งหมดอีกครั้ง
  showAllOrdersOnMap(): void {
    this.mapView()?.drawAllRoutes(this.workOrders());
  }

  // ล้างค่าข้อมูลใบงานและลบเส้นทางทั้งหมดออกจากแผนที่
  clearWorkOrders(): void {
    this.workOrders.set([]);
    this.mapView()?.clearRoutes();
  }

  // บันทึกรายการแผนงานและข้อมูลเส้นทางปัจจุบันลงคอนโซล
  saveWorkOrders(): void {
    if (this.workOrders().length === 0) return;
    console.log('บันทึกข้อมูล Work Orders ปัจจุบัน:', this.workOrders());
  }
}

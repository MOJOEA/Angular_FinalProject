import { Component, computed, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { WorkService } from '../../../service/api/work';
import { RoutesAMapService } from '../../../service/api/routesamap';
import { SettingService } from '../../../service/api/setting';
import { WorkJob } from '../../../Model/work';
import { SystemSetting } from '../../../Model/setting';
import { MapViewComponent } from '../../components/map-view/map-view';
import { calculateJobProfit, ProfitSummary } from '../../../Util/delivery-calculator';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [MapViewComponent, CommonModule],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements OnInit {
  readonly mapView = viewChild<MapViewComponent>('mapView');
  loading = signal<boolean>(false);
  errorMessage = signal<string>('');
  workOrders = signal<WorkJob[]>([]);
  selectedJob = signal<WorkJob | null>(null);
  systemSetting = signal<SystemSetting | null>(null);

  selectedJobProfit = computed<ProfitSummary | null>(() => {
    const job = this.selectedJob();
    const setting = this.systemSetting();
    return job && setting ? calculateJobProfit(job, setting) : null;
  });

  constructor(
    private workService: WorkService,
    private routesAMapService: RoutesAMapService,
    private settingService: SettingService
  ) {}

  // ฟังก์ชัน: เริ่มต้นโหลดการตั้งค่าระบบ
  async ngOnInit(): Promise<void> {
    await this.fetchSystemSetting();
  }

  // ฟังก์ชัน: ดึงและแปลงการตั้งค่าจาก Backend ก่อนโหลดใบงาน
  async fetchSystemSetting(): Promise<void> {
    try {
      const res = await this.settingService.get();

      if (res?.data) {
        const rawData = res.data;
        const formattedSetting: SystemSetting = {
          ...rawData,
          box_price: Number(rawData.box_price) || 0,
          box_cost: Number(rawData.box_cost) || 0,
          rider_base_fee: Number(rawData.rider_base_fee) || 0,
          rider_fee_box: Number(rawData.rider_fee_box) || 0,
          rider_speed_kmh: Number(rawData.rider_speed_kmh) || 0,
          deadline_time: Number(rawData.deadline_time) || 60
        };
        this.systemSetting.set(formattedSetting);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า:', error);
    }

  await this.loadWorkOrders();
}


  // ฟังก์ชัน: ดึงใบงาน ประมวลผลเส้นทาง และแสดงผลบนแผนที่
  private async fetchAndProcessWork(fetchApi: () => Promise<any>): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      const res = await fetchApi();
      const mockWorks: WorkJob[] = res?.data || [];
      if (mockWorks.length === 0) {
        this.workOrders.set([]);
        this.selectedJob.set(null);
        this.mapView()?.clearRoutes();
        this.errorMessage.set('ไม่พบข้อมูลใบงานจำลองในระบบ');
        return;
      }
     const worksWithRoutes = await this.routesAMapService.getRoutesForMultipleWorks(mockWorks);
     const allStops = worksWithRoutes.flatMap(work => 
     work.stops.map(s => {
        console.log(`งานที่ ${work.work_id} - จุดส่ง ${s.location_name} - distance raw:`, s.distance);
        return {
          งานที่: work.work_id,
          รหัสงาน: work.job_code,
          จุดส่ง: s.location_name,
          ลำดับ: s.sequence_no,
          ระยะทางของจุดนี้: s.distance ?? "ไม่มีข้อมูล"
        };
      })
    );

    console.table(allStops);

      this.workOrders.set(worksWithRoutes);
      this.selectedJob.set(null);
      this.mapView()?.drawAllRoutes(worksWithRoutes);
    } catch (error) {
      this.errorMessage.set('เกิดข้อผิดพลาดในการดึงและสร้างเส้นทางใบงาน');
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }

    // ฟังก์ชัน: โหลดใบงานทั้งหมดจากระบบ
  async loadWorkOrders(): Promise<void> {
    await this.fetchAndProcessWork(() => this.workService.getAllWork());
  }

  // ฟังก์ชัน: สร้างใบงานและแสดงเส้นทาง
  async generateWorkOrders(): Promise<void> {
    await this.fetchAndProcessWork(() => this.workService.getWorkCreat());
  }


  // ฟังก์ชัน: เลือกใบงานและแสดงเส้นทางเฉพาะรายการ
  selectOrderOnMap(job_code: string): void {
    const workOrder = this.workOrders().find(wo => wo.job_code === job_code);
    if (workOrder) {
      console.log('📦 ข้อมูล Job ที่เลือก:', workOrder);
      console.log('📍 ข้อมูล Stops ย่อย:', workOrder.stops);
      this.selectedJob.set(workOrder);
      this.mapView()?.drawSingleRoute(workOrder);
    }
  }

  // ฟังก์ชัน: แสดงเส้นทางใบงานทั้งหมดบนแผนที่
  showAllOrdersOnMap(): void {
    this.selectedJob.set(null);
    this.mapView()?.drawAllRoutes(this.workOrders());
  }

  // ฟังก์ชัน: ล้างใบงานและเส้นทางบนแผนที่
  clearWorkOrders(): void {
    this.selectedJob.set(null);
    this.workOrders.set([]);
    this.errorMessage.set('');
    this.mapView()?.clearRoutes();
  }
}

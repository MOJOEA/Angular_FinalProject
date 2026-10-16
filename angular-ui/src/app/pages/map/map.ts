import { Component, computed, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common'; // เพิ่มสำหรับใช้ | number ใน Template (ถ้าเป็น Standalone)
import { firstValueFrom } from 'rxjs';
import { Component, OnInit, signal, viewChild } from '@angular/core';

import { WorkService } from '../../../service/api/work'; 
import { RoutesAMapService } from '../../../service/api/routesamap'; 
import { SettingService } from '../../../service/api/setting'; //  เพิ่ม import SettingService
import { WorkJob } from '../../../Model/work';
import { SystemSetting } from '../../../Model/setting'; //เพิ่ม

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

  // 1. Signal เก็บงานที่ถูกกดเลือกดู
  selectedJob = signal<WorkJob | null>(null);

  // 2. ปรับให้เริ่มต้นเป็น null เพื่อรองรับข้อมูลจาก Database
  systemSetting = signal<SystemSetting | null>(null);

    
  // 3. คำนวณกำไร-ขาดทุนอัตโนมัติ (เพิ่มเงื่อนไข check null ของ setting)
  selectedJobProfit = computed<ProfitSummary | null>(() => {
    const job = this.selectedJob();
    const setting = this.systemSetting();

    // ถ้ายังไม่ได้กดเลือกงาน หรือข้อมูล setting จาก DB ยังโหลดไม่เสร็จ ให้ส่งคืน null
    if (!job || !setting) return null;
    return calculateJobProfit(job, setting);
  });
  
  constructor(
    private workService: WorkService, 
    private routesAMapService: RoutesAMapService,
    private settingService: SettingService // <--- [เพิ่ม]
  ) {}


  // โหลดข้อมูลและแสดงเส้นทางบนแผนที่ทันทีเมื่อเปิดหน้าจอ
  async ngOnInit(): Promise<void> {
    await this.fetchSystemSetting(); // <--- [เพิ่ม] โหลดค่า Setting จาก Database
  }

  // [เพิ่มฟังก์ชันใหม่] ดึงข้อมูลจากตาราง settings
  async fetchSystemSetting(): Promise<void> {
    try {
      // 1. เรียกใช้ฟังก์ชัน get() จาก SettingService
      const res: any = await firstValueFrom(this.settingService.get());

      //เพิ่ม 
      console.log('✅ ข้อมูล Setting จาก Backend:', res);
      
// เช็คว่ามี res.data ส่งกลับมาหรือไม่
      if (res && res.data) {
        const rawData = res.data;

        // แปลงชื่อฟิลด์จาก Backend (เช่น box_price) และเปลี่ยนค่า String เป็น Number
        const formattedSetting: any = {
          ...rawData,
          price_per_box: parseFloat(rawData.box_price || 0),
          food_cost_per_box: parseFloat(rawData.box_cost || 0),
          base_rider_fee: parseFloat(rawData.rider_base_fee || 0),
          rider_base_fee: Number(rawData.rider_base_fee) || 0,
          distance_rate_per_km: parseFloat(rawData.rider_fee_box || 5),
          delivery_deadline_mins: rawData.deadline_time || 60
        };

        this.systemSetting.set(formattedSetting);
        console.log('✅ แปลงข้อมูล Setting สำเร็จ:', formattedSetting);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลการตั้งค่า:', error);
    }
    this.loadWorkOrders();
  }

  private async fetchAndProcessWork(fetchApi: () => Promise<any>): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.errorMessage.set('');
    
    try {
      const res = await fetchApi();
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
  

  async loadWorkOrders(): Promise<void>{
    await this.fetchAndProcessWork(() => this.workService.getAllWork());
  }

  // ดึงข้อมูลใบงาน พ่วงพิกัดเส้นทางจาก API และส่งไปวาดบนแผนที่ทั้งหมด
  async generateWorkOrders(): Promise<void> {
    await this.fetchAndProcessWork(() => this.workService.getWorkCreat());
  }

  // ค้นหาและแสดงเส้นทางบนแผนที่เฉพาะใบงานเดี่ยวที่เลือก
  selectOrderOnMap(job_code: string): void {
    const workOrder = this.workOrders().find((wo) => wo.job_code === job_code);
    if (workOrder) { 
      this.selectedJob.set(workOrder);
      this.mapView()?.drawSingleRoute(workOrder);
    }
  }

  // สั่งให้แผนที่แสดงเส้นทางของทุกใบงานพร้อมกันทั้งหมดอีกครั้ง
  showAllOrdersOnMap(): void {
    this.selectedJob.set(null);
    this.mapView()?.drawAllRoutes(this.workOrders());
  }

  // ล้างค่าข้อมูลใบงานและลบเส้นทางทั้งหมดออกจากแผนที่
  clearWorkOrders(): void {
    this.selectedJob.set(null);
    this.workOrders.set([]);
    this.mapView()?.clearRoutes();
  }

  // บันทึกรายการแผนงานและข้อมูลเส้นทางปัจจุบันลงคอนโซล
  saveWorkOrders(): void {
    if (this.workOrders().length === 0) return;
    console.log('บันทึกข้อมูล Work Orders ปัจจุบัน:', this.workOrders());
  }
}

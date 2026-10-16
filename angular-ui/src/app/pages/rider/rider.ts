import { Component, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Coordinate } from '../../../Model/coordinate';
import { RouteStop, WorkJob } from '../../../Model/work';
import { WorkService } from '../../../service/api/work';
import { RoutesAMapService } from '../../../service/api/routesamap';
import { MapViewComponent } from '../../components/map-view/map-view';

const WORK_ID_KEY = 'driver-work-id';

const DEMO_CURRENT_POSITION: Coordinate = { latitude: 16.245842, longitude: 103.251458 };

@Component({
  selector: 'app-rider',
  standalone: true,
  imports: [FormsModule, MapViewComponent],
  templateUrl: './rider.html',
  styleUrl: './rider.css',
})
export class Rider implements OnInit {
  readonly mapView = viewChild<MapViewComponent>('mapView');

  workId = '';
  readonly selectedWork = signal<WorkJob | null>(null);
  readonly loading = signal(false);
  readonly notice = signal('');
  readonly errorMessage = signal('');
  readonly navigationInfo = signal<{ instruction: string; distance: string; accuracy: number } | null>(null);

  constructor(private readonly workService: WorkService, private readonly routesAMapService: RoutesAMapService) {}

  ngOnInit(): void {
    const savedId = localStorage.getItem(WORK_ID_KEY);
    if (!savedId) return;

    this.workId = savedId;
    void this.loadWorkById(Number(savedId), true);
  }

  async searchWork(): Promise<void> {
    const id = Number(this.workId.trim());
    if (!Number.isSafeInteger(id) || id < 1) {
      this.selectedWork.set(null);
      this.errorMessage.set("กรอกรหัสใบงานเป็นตัวเลขให้ถูกต้อง");
      return;
    }

    await this.loadWorkById(id, false);
  }

  private async loadWorkById(id: number, restoring: boolean): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set("");
    this.notice.set("");

    try {
      const response = await this.workService.getWork(id);
      const work: WorkJob | null = response?.data ?? response?.work ?? null;

      if (response?.success === false || !work || Number(work.work_id) !== id) {
        if (restoring) {
          localStorage.removeItem(WORK_ID_KEY);
          this.workId = "";
        }
        this.selectedWork.set(null);
        this.errorMessage.set("ไม่พบใบงานนี้");
        return;
      }

      if (work.status === "shipping") {
        if (!restoring) {
          this.selectedWork.set(null);
          this.errorMessage.set("ใบงานนี้ไม่ว่าง กำลังจัดส่งอยู่");
          return;
        }
      } else if (work.status === "pending") {
        await this.workService.acceptWork(id);
        work.status = "shipping";
      } else {
        if (restoring) {
          localStorage.removeItem(WORK_ID_KEY);
          this.workId = "";
        }
        this.selectedWork.set(null);
        this.errorMessage.set("ใบงานนี้ไม่พร้อมให้จัดส่ง");
        return;
      }

      localStorage.setItem(WORK_ID_KEY, String(id));
      this.workId = String(id);
      this.selectedWork.set(work);
      this.errorMessage.set("");
    } catch (error) {
      const status = (error as { status?: number })?.status;
      this.selectedWork.set(null);

      if (restoring && status === 404) {
        localStorage.removeItem(WORK_ID_KEY);
        this.workId = "";
        this.errorMessage.set("");
      } else if (status === 404) {
        this.errorMessage.set("ไม่พบใบงานนี้");
      } else if (status === 409) {
        this.errorMessage.set("ใบงานนี้ไม่ว่าง กำลังจัดส่งอยู่");
      } else {
        this.errorMessage.set("เรียก API ใบงานไม่สำเร็จ ตรวจสอบ backend แล้วลองใหม่");
      }

      console.error("โหลดหรือรับใบงานไม่สำเร็จ:", error);
    } finally {
      this.loading.set(false);
    }
  }

  showNavigation(work: WorkJob): void {
    // แสดงหน้า map แล้ววาดใบงานที่เลือกเพียงใบเดียว
    window.setTimeout(() => {
      this.mapView()?.drawSingleRoute(work);
      document
        .getElementById('rider-map')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  }

  async showStopNavigation(work: WorkJob, stop: RouteStop): Promise<void> {
    try {
      // สร้างเส้นทางจากจุดเริ่มต้นไปยังจุดส่งที่กดเพียงจุดเดียว
      const singleStopWork = await this.routesAMapService.getRouteForSingleWork({
        ...work,
        total_orders: 1,
        total_boxes: stop.box_count,
        stops: [stop],
      });

      this.mapView()?.drawSingleRoute(singleStopWork);
      document
        .getElementById('rider-map')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error('แสดงเส้นทางไปจุดนี้ไม่สำเร็จ:', error);
    }
  }

  startNavigation(work: WorkJob): void {
    const firstStop = work.stops[0];
    if (!firstStop) return;

    // ใช้ geometry ตามถนนที่โหลดและคำนวณไว้แล้วจากใบงาน ไม่ส่งพิกัดไปขอเส้นทางเพิ่ม
    const coordinates = work.geometry?.coordinates as [number, number][] | undefined;
    if (!coordinates?.length) {
      window.alert("ใบงานนี้ยังไม่มีข้อมูลเส้นทาง ลองโหลดใบงานใหม่อีกครั้ง");
      return;
    }

    const nearestIndex = (stop: RouteStop): number => {
      let nearest = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;
      coordinates.forEach(([longitude, latitude], index) => {
        const distance =
          (longitude - stop.longitude) ** 2 + (latitude - stop.latitude) ** 2;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });
      return nearest;
    };

    const firstIndex = nearestIndex(firstStop);
    if (firstIndex < 0) return;

    const activeWork: WorkJob = {
      ...work,
      total_orders: 1,
      total_boxes: firstStop.box_count,
      stops: [firstStop],
      geometry: {
        ...work.geometry,
        type: "LineString",
        coordinates: coordinates.slice(0, firstIndex + 1),
      },
    };

    const secondStop = work.stops[1];
    const secondIndex = secondStop ? nearestIndex(secondStop) : -1;
    const upcomingWork: WorkJob | undefined =
      secondStop && secondIndex > firstIndex
        ? {
            ...work,
            total_orders: 1,
            total_boxes: secondStop.box_count,
            stops: [secondStop],
            geometry: {
              ...work.geometry,
              type: "LineString",
              coordinates: coordinates.slice(firstIndex, secondIndex + 1),
            },
          }
        : undefined;

    this.mapView()?.drawNavigationRoutes(DEMO_CURRENT_POSITION, activeWork, upcomingWork);
    this.navigationInfo.set({
      instruction: `มุ่งหน้าไป ${firstStop.location_name}`,
      distance: `อีก ${this.distanceInMetres(DEMO_CURRENT_POSITION, firstStop)} ม.`,
      accuracy: 20,
    });
    this.sheetExpanded = false;
  }

  stopNavigation(): void {
    this.navigationInfo.set(null);
    this.mapView()?.clearRoutes();
  }

  private distanceInMetres(from: Coordinate, to: RouteStop): number {
    const radians = (degrees: number) => (degrees * Math.PI) / 180;
    const latDiff = radians(to.latitude - from.latitude);
    const lonDiff = radians(to.longitude - from.longitude);
    const a =
      Math.sin(latDiff / 2) ** 2 +
      Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) *
        Math.sin(lonDiff / 2) ** 2;
    return Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
  async goBack(): Promise<void> {
    const work = this.selectedWork();
    if (!work) return;

    this.loading.set(true);
    try {
      await this.workService.logoutWork(work.work_id);
      localStorage.removeItem(WORK_ID_KEY);
      this.workId = "";
      this.navigationInfo.set(null);
      this.mapView()?.clearRoutes();
      this.selectedWork.set(null);
      this.errorMessage.set("");
    } catch (error) {
      console.error("คืนใบงานไม่สำเร็จ:", error);
      this.errorMessage.set("คืนใบงานไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      this.loading.set(false);
    }
  }

  sheetExpanded = false;
  private sheetStartY = 0;

  startSheetDrag(event: PointerEvent): void {
    this.sheetStartY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  endSheetDrag(event: PointerEvent): void {
    const distance = event.clientY - this.sheetStartY;

    if (distance < -30) {
      this.sheetExpanded = true;
    } else if (distance > 30) {
      this.sheetExpanded = false;
    } else {
      this.sheetExpanded = !this.sheetExpanded;
    }
  }
}


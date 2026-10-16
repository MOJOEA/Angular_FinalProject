import { Component, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Coordinate } from '../../../Model/coordinate';
import { RouteStop, WorkJob } from '../../../Model/work';
import { WorkService } from '../../../service/api/work';
import { RoutesAMapService } from '../../../service/api/routesamap';
import { MapViewComponent } from '../../components/map-view/map-view';

const DEMO_CURRENT_POSITION: Coordinate = { latitude: 16.245842, longitude: 103.251458 };

@Component({
  selector: 'app-rider',
  standalone: true,
  imports: [FormsModule, MapViewComponent],
  templateUrl: './rider.html',
  styleUrl: './rider.css',
})
export class Rider {
  readonly mapView = viewChild<MapViewComponent>('mapView');

  workId = '';
  readonly selectedWork = signal<WorkJob | null>(null);
  readonly loading = signal(false);
  readonly notice = signal('');
  readonly errorMessage = signal('');
  readonly navigationInfo = signal<{ instruction: string; distance: string; accuracy: number } | null>(null);

  constructor(private readonly workService: WorkService, private readonly routesAMapService: RoutesAMapService) {}

  async searchWork(): Promise<void> {
    const id = Number(String(this.workId ?? '').trim());
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
      let work: WorkJob | null = response?.data ?? response?.work ?? null;

      if (response?.success === false || !work || Number(work.work_id) !== id) {
        if (restoring) {
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
          this.workId = "";
        }
        this.selectedWork.set(null);
        this.errorMessage.set("ใบงานนี้ไม่พร้อมให้จัดส่ง");
        return;
      }
      // Add OSRM geometry so navigation can draw the road route.
      work = await this.routesAMapService.getRouteForSingleWork(work);
      this.workId = String(id);
      this.selectedWork.set(work);
      this.errorMessage.set("");
    } catch (error) {
      const status = (error as { status?: number })?.status;
      this.selectedWork.set(null);

      if (restoring && status === 404) {
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

    const upcomingStops = work.stops.slice(1);
    const lastUpcomingStop = upcomingStops[upcomingStops.length - 1];
    const lastUpcomingIndex = lastUpcomingStop ? nearestIndex(lastUpcomingStop) : -1;
    const upcomingWork: WorkJob | undefined =
      upcomingStops.length > 0 && lastUpcomingIndex > firstIndex
        ? {
            ...work,
            total_orders: upcomingStops.length,
            total_boxes: upcomingStops.reduce((total, stop) => total + Number(stop.box_count || 0), 0),
            stops: upcomingStops,
            geometry: {
              ...work.geometry,
              type: "LineString",
              coordinates: coordinates.slice(firstIndex, lastUpcomingIndex + 1),
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


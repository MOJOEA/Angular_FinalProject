// map-view.component.ts
import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { WorkJob } from '../../../Model/work'; // 🌟 เปลี่ยนมาอิมพอร์ต Model โครงสร้างจริงปัจจุบันของคุณ

const MAP_CONFIG = {
  initCenter: [16.2443, 103.2502] as L.LatLngExpression, // พิกัดจุดศูนย์กลางเริ่มต้นของแผนที่
  initZoom: 15, // ระดับการซูมเริ่มต้นตอนเปิดแผนที่
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // ลิงก์ที่มาของภาพพื้นหลังแผนที่
  maxZoom: 19, // ระดับที่ซูมเข้าได้ลึกที่สุด
  lineWidth: 6, // ความหนาของเส้นบนแผนที่
  lineOpacity: 0.85, // ความโปร่งแสงของเส้นบนแผนที่
};


@Component({
  selector: 'app-map-view',
  standalone: true,
  templateUrl: './map-view.html',
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class MapViewComponent implements AfterViewInit {
  private map!: L.Map;
  private routePolylines: L.Polyline[] = [];

  constructor() {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.buildNewMap(MAP_CONFIG.initCenter, MAP_CONFIG.initZoom);
    }, 300);
  }

    // สร้างแผนที่ใหม่และล้างอินสแตนซ์เดิมถ้ามีอยู่
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

    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
  }

  // วาดเส้นทางทั้งหมดของทุกใบงานลงบนแผนที่
  public drawAllRoutes(workOrders: WorkJob[]): void {
    if (!this.map) return;
    this.clearRoutes();
    const routeGroup = L.featureGroup();

    workOrders.forEach((workOrder) => {
      const polyline = this.drawRoutes(workOrder);
      if (polyline) { 
        routeGroup.addLayer(polyline); 
      }
    });

    this.ZoomToFitRoutes(routeGroup);
  }

  // วาดเส้นทางของใบงานใบเดียวที่ระบุ
  public drawSingleRoute(workOrder: WorkJob): void {
    this.clearRoutes(); // เคลียร์เส้นอื่นออกก่อน
    const polyline = this.drawRoutes(workOrder);
    const routeGroup = L.featureGroup();

    if (polyline) { 
      routeGroup.addLayer(polyline);
    }
    this.ZoomToFitRoutes(routeGroup);
  }

  // ประมวลผลพิกัดและวาดเส้นทางเดี่ยวลงแผนที่
  private drawRoutes(workOrder: WorkJob): L.Polyline | null {
    if (!this.map) return null;
        
    const coordinates = workOrder.geometry?.coordinates;
    if (!coordinates || coordinates.length === 0) return null;
    const correctedCoords = coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as L.LatLngExpression);

    
    const lineColor = workOrder.color || '#3388ff';
    const polyline = L.polyline(correctedCoords, {
        color: lineColor,
        weight: MAP_CONFIG.lineWidth,
        opacity: MAP_CONFIG.lineOpacity,
    }).addTo(this.map);

    this.routePolylines.push(polyline);
    return polyline;
  }

  // ลบเส้นทางทั้งหมดออกจากแผนที่และล้างค่าตัวแปรเก็บเส้นทาง
  public clearRoutes(): void {
    if (this.map) {
      this.routePolylines.forEach((route) => this.map.removeLayer(route));
    }
    this.routePolylines = [];
  }

  // ปรับขนาดและมุมมองแผนที่ให้พอดีกับกลุ่มเส้นทางที่วาด
  private ZoomToFitRoutes(routeGroup: L.FeatureGroup): void {
    if (!this.map) return;
    if (routeGroup.getLayers().length > 0) {
      this.map.fitBounds(routeGroup.getBounds(), {
          padding:[30,30],
      });
    }
  }
}

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
  private stopMarkers: L.Marker[] = [];

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

    const len = workOrders.length;
    for (let i = 0; i < len; i++) {
      const polyline = this.drawRoutes(workOrders[i]);
      if (polyline) { 
        routeGroup.addLayer(polyline); 
      }
    }

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

    const stops = workOrder.stops;
    if (stops && stops.length > 0) {
      const stopsLen = stops.length;
      for (let i = 0; i < stopsLen; i++) {
        const stop = stops[i];
        
        const customIcon = L.divIcon({
          html: `<svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://w3.org">
                  <path d="M15 0C6.71 0 0 6.71 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71 23.29 0 15 0Z" fill="${lineColor}"/>
                  <circle cx="15" cy="15" r="10" fill="white"/>
                  <text x="15" y="19" fill="${lineColor}" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">${stop.sequence_no}</text>
                 </svg>`,
          className: '',
          iconSize:[20,20],
          iconAnchor:[20,20],
          popupAnchor: [0, -40]
        });

        const marker = L.marker([stop.latitude, stop.longitude], { icon: customIcon })
          .bindPopup(`<b>${stop.sequence_no}. ${stop.customer_name}</b><br>${stop.location_name}<br>จำนวน: ${stop.box_count} กล่อง`)
          .addTo(this.map);

        this.stopMarkers.push(marker);
      }
    }

    return polyline;
  }

  // ลบเส้นทางทั้งหมดออกจากแผนที่และล้างค่าตัวแปรเก็บเส้นทาง
  public clearRoutes(): void {
    if (this.map) {
      const polyLen = this.routePolylines.length;
      for (let i = 0; i < polyLen; i++) {
        this.map.removeLayer(this.routePolylines[i]);
      }
      const markerLen = this.stopMarkers.length;
      for (let i = 0; i < markerLen; i++) {
        this.map.removeLayer(this.stopMarkers[i]);
      }
    }
    this.routePolylines = [];
    this.stopMarkers = [];
  }

  // ปรับขนาดและมุมมองแผนที่ให้พอดีกับกลุ่มเส้นทางที่วาด
  private ZoomToFitRoutes(routeGroup: L.FeatureGroup): void {
    if (!this.map) return;
    
    const markerLen = this.stopMarkers.length;
    for (let i = 0; i < markerLen; i++) {
      routeGroup.addLayer(this.stopMarkers[i]);
    }

    if (routeGroup.getLayers().length > 0) {
      this.map.fitBounds(routeGroup.getBounds(), {
          padding:[30,30],
      });
    }
  }
}

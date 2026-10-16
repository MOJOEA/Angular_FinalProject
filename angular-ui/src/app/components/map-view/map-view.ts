import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { WorkJob } from '../../../Model/work';

const MAP_CONFIG = {
  initCenter: [16.2443, 103.2502] as L.LatLngExpression,
  initZoom: 15,
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxZoom: 19,
  lineWidth: 6,
  lineOpacity: 0.85,
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

  // ฟังก์ชัน: เริ่มต้นสร้างแผนที่หลังจากโหลด View
  ngAfterViewInit(): void {
    setTimeout(() => this.buildNewMap(MAP_CONFIG.initCenter, MAP_CONFIG.initZoom), 300);
  }

  // ฟังก์ชัน: สร้างแผนที่และกำหนดภาพพื้นหลัง
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
    setTimeout(() => this.map.invalidateSize(), 100);
  }

  // ฟังก์ชัน: วาดเส้นทางทั้งหมดของทุกใบงานบนแผนที่
  public drawAllRoutes(workOrders: WorkJob[]): void {
    if (!this.map) return;
    this.clearRoutes();
    const routeGroup = L.featureGroup();
    for (let i = 0; i < workOrders.length; i++) {
      const polyline = this.drawRoutes(workOrders[i]);
      if (polyline) routeGroup.addLayer(polyline);
    }
    this.ZoomToFitRoutes(routeGroup);
  }

  // ฟังก์ชัน: วาดเส้นทางของใบงานที่เลือก
  public drawSingleRoute(workOrder: WorkJob): void {
    this.clearRoutes();
    const polyline = this.drawRoutes(workOrder);
    const routeGroup = L.featureGroup();
    if (polyline) routeGroup.addLayer(polyline);
    this.ZoomToFitRoutes(routeGroup);
  }

  // ฟังก์ชัน: แปลงพิกัดและวาดเส้นทางพร้อม Marker จุดส่ง
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
      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        const customIcon = L.divIcon({
          html: `<svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://w3.org"><path d="M15 0C6.71 0 0 6.71 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71 23.29 0 15 0Z" fill="${lineColor}"/><circle cx="15" cy="15" r="10" fill="white"/><text x="15" y="19" fill="${lineColor}" font-family="Arial" font-size="12" font-weight="bold" text-anchor="middle">${stop.sequence_no}</text></svg>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [20, 20],
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

  // ฟังก์ชัน: ลบเส้นทางและ Marker ทั้งหมดออกจากแผนที่
  public clearRoutes(): void {
    if (this.map) {
      for (let i = 0; i < this.routePolylines.length; i++) this.map.removeLayer(this.routePolylines[i]);
      for (let i = 0; i < this.stopMarkers.length; i++) this.map.removeLayer(this.stopMarkers[i]);
    }
    this.routePolylines = [];
    this.stopMarkers = [];
  }

  // ฟังก์ชัน: ปรับมุมมองแผนที่ให้ครอบคลุมเส้นทางและจุดส่งทั้งหมด
  private ZoomToFitRoutes(routeGroup: L.FeatureGroup): void {
    if (!this.map) return;
    for (let i = 0; i < this.stopMarkers.length; i++) routeGroup.addLayer(this.stopMarkers[i]);
    if (routeGroup.getLayers().length > 0) {
      this.map.fitBounds(routeGroup.getBounds(), { padding: [30, 30] });
    }
  }
}

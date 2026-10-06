import { Component, AfterViewInit, input, effect } from '@angular/core';
import * as L from 'leaflet';
import { getRandomColor } from '../../../Util/random/randomColor';
import { WorkOrder } from '../../../Model/work';

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
  workOrders = input<WorkOrder[]>([]);
  private map!: L.Map;
  private routePolylines: L.Polyline[] = [];

  constructor() {
    effect(() => {
      this.workOrders();
      this.drawAllRoutes();
    });
  }

  ngAfterViewInit(): void {
    // หน่วงเวลาเล็กน้อยเพื่อให้ระบบ Render HTML Container เสร็จสมบูรณ์ก่อนเรียกใช้แผนที่
    setTimeout(() => {
      this.buildNewMap(MAP_CONFIG.initCenter, MAP_CONFIG.initZoom);
    }, 300);
  }

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

    // สั่งคำนวณขนาดพื้นที่ Canvas แผนที่ใหม่ เพื่อป้องกันการบิดเบี้ยวหรือเป็นสีเทาว่างเปล่า
    setTimeout(() => {
      this.map.invalidateSize();
      // เรียกวาดเส้นทางครั้งแรกทันทีเมื่อแผนที่พร้อมทำงานอย่างสมบูรณ์
      this.drawAllRoutes();
    }, 100);
  }

  private clearRoutes(): void {
    if (this.map) {
      this.routePolylines.forEach((route) => this.map.removeLayer(route));
    }
    this.routePolylines = [];
  }

  private drawAllRoutes(): void {
    if (!this.map) return;
    this.clearRoutes();
    
    const allPoints: L.LatLngExpression[] = [];

    this.workOrders().forEach((workOrder) => {
      const coords = workOrder.routeCoordinates;
      if (!coords || coords.length === 0) return;

      const lineColor = getRandomColor();
      
      //  แก้ไขโครงสร้างการดึงอาร์เรย์พิกัด: ป้องกันสับสนเรื่องอินเด็กซ์ย้อนกลับ
      const correctedCoords = coords.map((coord: any) => { return [coord[1], coord[0]] as L.LatLngExpression });

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
        padding:[30,30],
      });
    }
  }
}

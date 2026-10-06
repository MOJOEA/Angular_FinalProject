// map-view.component.ts
import { Component, AfterViewInit, input } from '@angular/core';
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
  private map!: L.Map;
  private routePolylines: L.Polyline[] = [];

  constructor() {
  }

  ngAfterViewInit(): void {
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

    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);
  }

  public drawAllRoutes(workOrders: WorkOrder[]): void {
    if (!this.map) return;
    this.clearRoutes();
    const routeGroup = L.featureGroup();

    workOrders.forEach((workOrder) => {
      const polyline = this.drawRoutes(workOrder);
      if (polyline) { 
        routeGroup.addLayer(polyline); 
      }
    });

    if (routeGroup.getLayers().length > 0) {
      this.map.fitBounds(routeGroup.getBounds(), {
          padding:[30,30],
      });
    }
  }

  public drawSingleRoute(workOrder: WorkOrder): void {
    this.clearRoutes(); // เคลียร์เส้นอื่นออกก่อน
    this.drawRoutes(workOrder); // วาดและซูมทันที
  }


  public clearRoutes(): void {
    if (this.map) {
      this.routePolylines.forEach((route) => this.map.removeLayer(route));
    }
    this.routePolylines = [];
  }

  private drawRoutes(workOrder: WorkOrder, shouldFitBounds: boolean = true): L.Polyline | null {
    if (!this.map) return null;
        
    const coords = workOrder.routeCoordinates;
    if (!coords || coords.length === 0) return null;

    const correctedCoords = coords.map((coord: [number, number]) => [coord[1], coord[0]] as L.LatLngExpression);
    const lineColor = getRandomColor();

    const polyline = L.polyline(correctedCoords, {
        color: lineColor,
        weight: MAP_CONFIG.lineWidth,
        opacity: MAP_CONFIG.lineOpacity,
    }).addTo(this.map);

    this.routePolylines.push(polyline);

    if (shouldFitBounds) {
      this.map.fitBounds(polyline.getBounds(), {
          padding:[30,30],
      });
    }

    return polyline;
  }
}

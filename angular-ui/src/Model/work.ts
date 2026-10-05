import { Order } from './order';

export interface PlanningOrder extends Order {
  latitude: number;
  longitude: number;
  distanceFromDepot: number;
  bearing: number;
  direction: string;
}

export interface WorkOrder {
  work_order_id: string;
  orders: PlanningOrder[];
  totalQuantity: number;
  estimatedDistance: number;
  routeCoordinates?: any[];
  routeDistance?: String;
  routeDuration?: String;
}
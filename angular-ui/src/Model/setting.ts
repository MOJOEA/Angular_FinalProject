export interface Settings {
  id:                           number;
  shop_name:                    string;
  shop_address?:                string;
  shop_latitude:                number;
  shop_longitude:               number;
  box_price:                    number;
  box_cost:                     number;
  rider_base_fee:               number;
  rider_fee_box:                number;
  rider_speed_kmh:              number;
  max_orders_rider:             number;
  max_boxes_order:              number;
  departure_time:               string;
  deadline_time:                number;
  service_radius_km:            number;
  updated_at?:                  Date;
}
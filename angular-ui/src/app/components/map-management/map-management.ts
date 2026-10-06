import { Component, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Customer } from '../../../Model/customer';
import { Order } from '../../../Model/order';
import { WorkOrder } from '../../../Model/work';

@Component({
  selector: 'app-map-management',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './map-management.html',
})
export class MapManagementComponent {
  orders = input<Order[]>([]);
  customers = input<Customer[]>([]);
  workOrders = input<WorkOrder[]>([]);
  loading = input<boolean>(false);
  
  generateWork = output<void>();
  clearWork = output<void>();
  saveWork = output<void>();
  selectOrder = output<string>();
  showAll = output<void>();

  searchCustomerName(customer_id: number): string {
    const customer = this.customers().find((c) => c.customer_id === customer_id);
    return customer ? customer.name : 'ไม่พบลูกค้า';
  }
}

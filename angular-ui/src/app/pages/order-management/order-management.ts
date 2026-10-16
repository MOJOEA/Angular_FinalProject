import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order } from '../../../Model/order';
import { CustomerService } from '../../../service/api/customer';
import { OrderService } from '../../../service/api/order';

interface OrderCustomer {
  customer_id: number;
  name: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Component({
  selector: 'app-order-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.html',
  styleUrl: './order-management.css',
})
export class OrderManagement implements OnInit {
  orders: Order[] = [];
  customers: OrderCustomer[] = [];
  loading = true;
  loadError = '';
  searchQuery = '';
  currentPage = 1;
  readonly pageSize = 8;
  dialogOpen = false;
  editingOrderId: number | null = null;
  formError = '';
  saving = false;
  deletingOrderId: number | null = null;
  form = this.emptyForm();

  constructor(
    private readonly orderService: OrderService,
    private readonly customerService: CustomerService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    void this.loadOrders();
    void this.loadCustomers();
  }

  get filteredOrders(): Order[] {
    const query = this.searchQuery.trim().toLocaleLowerCase();
    if (!query) return this.orders;

    return this.orders.filter((order) => {
      const customer = this.customerName(order.customer_id).toLocaleLowerCase();
      return [
        String(order.order_id),
        String(order.customer_id),
        order.created_at,
        order.order_note,
        customer,
      ]
        .some((value) => value.toLocaleLowerCase().includes(query));
    });
  }

  get visibleOrders(): Order[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredOrders.length);
  }

  get totalQuantity(): number {
    return this.orders.reduce((total, order) => total + order.box_count, 0);
  }

  get customerCount(): number {
    return new Set(this.orders.map((order) => order.customer_id)).size;
  }

  customerName(customerId: number): string {
    const orderCustomer = this.orders.find((order) => order.customer_id === customerId)?.customer_name;
    return orderCustomer
      ?? this.customers.find((customer) => customer.customer_id === customerId)?.name
      ?? `ลูกค้า #${customerId}`;
  }

  statusLabel(status: Order['status']): string {
    const labels: Record<Order['status'], string> = {
      pending: 'รอดำเนินการ',
      delivered: 'จัดส่งแล้ว',
      cancelled: 'ยกเลิก',
    };
    return labels[status];
  }

  onSearch(): void {
    this.currentPage = 1;
  }

  openAddDialog(): void {
    this.editingOrderId = null;
    this.form = this.emptyForm();
    this.formError = '';
    this.dialogOpen = true;
  }

  openEditDialog(order: Order): void {
    this.editingOrderId = order.order_id;
    this.form = {
      customer_id: order.customer_id,
      box_count: order.box_count,
      order_note: order.order_note,
    };
    this.formError = '';
    this.dialogOpen = true;
  }

  closeDialog(): void {
    this.dialogOpen = false;
    this.formError = '';
  }

  async saveOrder(): Promise<void> {
    if (this.saving) return;
    const boxCount = Number(this.form.box_count);
    if (
      !this.form.customer_id
      || !this.customers.some((customer) => customer.customer_id === Number(this.form.customer_id))
      || !Number.isInteger(boxCount)
      || boxCount < 1
    ) {
      this.formError = 'กรุณาเลือกลูกค้าและระบุจำนวนกล่องอย่างน้อย 1 กล่อง';
      return;
    }

    const order = {
      customer_id: Number(this.form.customer_id),
      box_count: boxCount,
      order_note: this.form.order_note.trim(),
    };
    this.saving = true;
    this.formError = '';
    try {
      if (this.editingOrderId === null) {
        await this.orderService.createOrder(order);
      } else {
        await this.orderService.updateOrder(this.editingOrderId, order);
      }
      this.closeDialog();
      await this.loadOrders();
    } catch (error: unknown) {
      this.formError = 'บันทึกออเดอร์ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ API';
      console.error('บันทึกออเดอร์ผ่าน API ไม่สำเร็จ', error);
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  async deleteOrder(order: Order): Promise<void> {
    if (this.deletingOrderId !== null) return;
    if (!confirm(`ต้องการลบออเดอร์ #${order.order_id} ของ ${this.customerName(order.customer_id)} ใช่หรือไม่?`)) {
      return;
    }

    this.deletingOrderId = order.order_id;
    this.loadError = '';
    try {
      await this.orderService.deleteOrder(order.order_id);
      await this.loadOrders();
    } catch (error: unknown) {
      this.loadError = `ลบออเดอร์ #${order.order_id} ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ API`;
      console.error(`ลบออเดอร์ #${order.order_id} ผ่าน API ไม่สำเร็จ`, error);
    } finally {
      this.deletingOrderId = null;
      this.cdr.detectChanges();
    }
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  private async loadOrders(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      const orders = await this.orderService.getAll();
      this.orders = [...orders].sort((a, b) => b.order_id - a.order_id);
      this.currentPage = Math.min(this.currentPage, this.totalPages);
    } catch (error: unknown) {
      this.loadError = 'ไม่สามารถโหลดรายการออเดอร์จาก API ได้';
      console.error('โหลดรายการออเดอร์จาก API ไม่สำเร็จ', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadCustomers(): Promise<void> {
    try {
      const response: unknown = await this.customerService.getAllCustomers();
      const records = Array.isArray(response)
        ? response
        : isRecord(response) && Array.isArray(response['data'])
          ? response['data']
          : isRecord(response) && Array.isArray(response['customers'])
            ? response['customers']
            : null;

      if (!records) throw new Error('รูปแบบข้อมูลลูกค้าจาก API ไม่ถูกต้อง');
      this.customers = records.flatMap((record): OrderCustomer[] => {
        if (!isRecord(record)) return [];
        const customerId = Number(record['customer_id'] ?? record['id']);
        const name = record['customer_name'] ?? record['name'];
        return Number.isInteger(customerId) && customerId > 0 && typeof name === 'string'
          ? [{ customer_id: customerId, name }]
          : [];
      });
    } catch (error: unknown) {
      this.loadError = 'ไม่สามารถโหลดข้อมูลลูกค้าจาก API ได้';
      console.error('โหลดข้อมูลลูกค้าจาก API ไม่สำเร็จ', error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  private emptyForm(): Pick<Order, 'customer_id' | 'box_count' | 'order_note'> {
    return {
      customer_id: 0,
      box_count: 1,
      order_note: '',
    };
  }
}

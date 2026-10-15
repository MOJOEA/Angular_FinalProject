import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { ChangeDetectorRef } from '@angular/core';
import { CustomerService } from '../../../service/api/customer';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  selected: boolean;
}

@Component({
  selector: 'app-customer-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-management.html',
  styleUrl: './customer-management.css',
})
export class CustomerManagement implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapElement') private mapElement?: ElementRef<HTMLDivElement>;

  customers: Customer[] = [];
  loading = false;
  loadError = '';

  searchQuery = '';
  currentPage = 1;
  readonly pageSize = 8;
  dialogOpen = false;
  editingCustomerId: string | null = null;
  formError = '';
  clipboardMessage = '';
  form = this.emptyForm();

  private map?: L.Map;
  private marker?: L.CircleMarker;

  constructor(private readonly customerService: CustomerService, private readonly cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    void this.loadCustomers();
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  get filteredCustomers(): Customer[] {
    const query = this.searchQuery.trim().toLocaleLowerCase();
    if (!query) return this.customers;
    return this.customers.filter((customer) =>
      [customer.id, customer.name, customer.phone, customer.address]
        .some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }

  get visibleCustomers(): Customer[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCustomers.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCustomers.length / this.pageSize));
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredCustomers.length);
  }

  get allVisibleSelected(): boolean {
    return this.visibleCustomers.length > 0 && this.visibleCustomers.every((customer) => customer.selected);
  }

  onSearch(): void {
    this.currentPage = 1;
    void this.loadCustomers();
  }

  private async loadCustomers(): Promise<void> {
    this.loading = true;
    this.loadError = '';

    try {
      const query = this.searchQuery.trim();
      const params = query ? { name: query } : undefined;

      const response: any = await this.customerService.getAllCustomers(params);
      
      const rawData = Array.isArray(response) 
        ? response 
        : (response?.data || response?.customers || []);

      if (Array.isArray(rawData)) {
        this.customers = rawData.map((customer: any) => ({
          id: `CUST-${customer.customer_id ?? customer.id ?? '000'}`,
          name: customer.customer_name ?? customer.name ?? 'ไม่มีชื่อ',
          phone: customer.phone_number ?? customer.phone ?? '-',
          address: customer.location_name ?? customer.address ?? '-',
          lat: Number(customer.latitude ?? customer.lat ?? 13.73142),
          lng: Number(customer.longitude ?? customer.lng ?? 100.58124),
          selected: false,
        }));
      } else {
        this.loadError = 'รูปแบบข้อมูลลูกค้าไม่ถูกต้อง';
      }
    } catch (error) {
      this.loadError = 'ไม่สามารถเชื่อมต่อกับ Server API ได้';
      console.error('API Error:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  toggleVisibleSelection(selected: boolean): void {
    this.visibleCustomers.forEach((customer) => customer.selected = selected);
  }

  openAddDialog(): void {
    this.editingCustomerId = null;
    this.form = this.emptyForm();
    this.formError = '';
    this.dialogOpen = true;
    setTimeout(() => this.initializeMap(), 0);
  }

  openEditDialog(customer: Customer): void {
    this.editingCustomerId = customer.id;
    this.form = { ...customer };
    this.formError = '';
    this.dialogOpen = true;
    setTimeout(() => this.initializeMap(), 0);
  }

  closeDialog(): void {
    this.dialogOpen = false;
    this.destroyMap();
  }

  async copyCoordinates(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${this.form.lat}, ${this.form.lng}`);
      this.clipboardMessage = 'คัดลอกแล้ว';
    } catch (error) {
      this.clipboardMessage = 'ไม่สามารถคัดลอกพิกัดได้';
      console.error('คัดลอกพิกัด GPS ไม่สำเร็จ', error);
    }
  }

  async saveCustomer(): Promise<void> {
    const name = this.form.name.trim();
    const phone = this.form.phone.trim();
    if (!name || !phone || !this.form.address.trim()) {
      this.formError = 'กรุณากรอกชื่อ เบอร์โทรศัพท์ และที่อยู่ให้ครบถ้วน';
      return;
    }

    const payload = {
      customer_name: name,
      phone_number: phone,
      location_name: this.form.address,
      latitude: this.form.lat,
      longitude: this.form.lng
    };

    this.formError = '';
    this.loading = true;

    try {
      if (this.editingCustomerId) {
        const rawId = this.editingCustomerId.replace('CUST-', '');
        
        await this.customerService.updateCustomer(rawId, payload);
      } else {
        
        await this.customerService.createCustomer(payload);
      }

      await this.loadCustomers();
      this.closeDialog();
    } catch (err) {
      this.formError = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ หรือบันทึกข้อมูลไม่สำเร็จ';
      console.error('Save error:', err);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async deleteCustomer(customer: Customer): Promise<void> {
    const rawId = customer.id.replace('CUST-', '');
    if (confirm(`คุณต้องการลบข้อมูลของ ${customer.name} ใช่หรือไม่?`)) {
      try {
        const response: any = await this.customerService.deleteCustomer(rawId);
        if (response && (response.success || response)) {
          await this.loadCustomers();
        } else {
          alert('ลบข้อมูลไม่สำเร็จ');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        console.error(err);
      }
      this.cdr.detectChanges();
    }
  }

  viewMap(customer: Customer): void {
    window.open(`https://www.google.com/maps?q=${customer.lat},${customer.lng}`, '_blank', 'noopener');
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  private emptyForm(): Omit<Customer, 'id'> & { id: string } {
    return {
      id: '',
      name: '',
      phone: '',
      address: '',
      lat: 16.245842,
      lng: 103.251458,
      selected: false,
    };
  }

  private initializeMap(): void {
    const element = this.mapElement?.nativeElement;
    if (!this.dialogOpen || !element) return;

    this.destroyMap();
    this.map = L.map(element).setView([this.form.lat, this.form.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(this.map);

    this.marker = L.circleMarker([this.form.lat, this.form.lng], {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#e53935',
      fillOpacity: 1,
    }).addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.form.lat = Number(event.latlng.lat.toFixed(6));
      this.form.lng = Number(event.latlng.lng.toFixed(6));
      this.marker?.setLatLng(event.latlng);
    });

    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private destroyMap(): void {
    this.map?.remove();
    this.map = undefined;
    this.marker = undefined;
  }
}
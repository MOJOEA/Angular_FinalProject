import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MapViewComponent } from '../../components/map-view/map-view'; // นำ MapView เดิมมาใช้

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MapViewComponent],
  templateUrl: './detail.html',
  styleUrl: './detail.css'
})
export class Detail implements OnInit {
  workId: string = '';

  // โครงสร้างข้อมูลคำนวณฝั่งขวา (สามารถเปลี่ยนไปผูกกับ API ได้ภายหลัง)
  financials = {
    revenue: 3500,  // รายได้รวม
    cost: 1800,     // ต้นทุนรวม
    profit: 1700    // กำไรสุทธิ
  };

  // ตัวอย่างรายการออเดอร์ในใบงานนี้
  orders = [
    { id: 'ORD-001', customerName: 'พิมพ์ใจ คำชาย', status: 'pending', itemsCount: 3, amount: 1200, address: 'มหาสารคาม' },
    { id: 'ORD-002', customerName: 'พิมพ์ใจ คำชาย', status: 'pending', itemsCount: 1, amount: 800, address: 'มหาสารคาม' },
    { id: 'ORD-003', customerName: 'สมชาย ใจดี', status: 'delivered', itemsCount: 3, amount: 1500, address: 'มหาวิทยาลัย' }
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // ดึง ID จาก URL เช่น http://localhost:4200/detail/JOB-001
    this.workId = this.route.snapshot.paramMap.get('id') || 'JOB-001';
  }
}
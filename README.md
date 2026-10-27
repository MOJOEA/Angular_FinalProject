# Angular_FinalProject
# 🚚 Rider Delivery & Profit Calculation System

ระบบบริหารจัดการเส้นทางจัดส่งสินค้า คำนวณค่าตอบแทนไรเดอร์ตามจำนวนกล่องคงเหลือและระยะทางย่อย วิเคราะห์กำไร-ขาดทุนราย

---

## คำอธิบายโปรเจกต์ (Overview)

เว็บแอปพลิเคชันสำหรับบริหารการจัดส่งอาหาร/สินค้าแบบหลายจุดส่ง (Multi-stop Delivery) ที่ช่วยประเมินความคุ้มค่าของการจัดส่งในแต่ละใบงาน (Work Job) โดยแบ่งออกเป็น 2 ระบบหลัก คือ **ระบบฝั่งเจ้าของร้าน (Owner System)** และ **ระบบฝั่งไรเดอร์ (Rider System)**


---

## ลอจิกการคำนวณหลัก (Core Formulas)

1. **ค่าตอบแทนไรเดอร์ต่อจุดส่ง (Rider Step Fee):**
   $$\text{Total Rider Fee} = \text{Rider Base Fee} + \sum_{i=1}^{N} \left( 2 \times \text{Remaining Boxes}_i \times \text{Distance}_i \right)$$

2. **กำไรสุทธิของใบงาน (Net Profit):**
   $$\text{Total Revenue} = \text{Total Boxes} \times \text{Box Price}$$
   $$\text{Food Cost} = \text{Total Boxes} \times \text{Box Cost}$$
   $$\text{Net Profit} = \text{Total Revenue} - \text{Food Cost} - \text{Total Rider Cost}$$

---

## เครื่องมือ Framework และ Library ที่ใช้ (Tech Stack)

### Frontend (Angular UI)
- **Framework**: Angular (v17+)
- **Language**: TypeScript, HTML5, SCSS/CSS
- **State & Reactive**: RxJS
- **Map & Geolocation**: Leaflet / OpenStreetMap
- **HTTP Client**: Angular `HttpClient`

### Backend (REST API)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Database Driver**: `mysql2` / `promise`
- **Utilities**: `dotenv`, `cors`, `body-parser`

### External APIs
- **OSRM (Open Source Routing Machine) API**: คำนวณเส้นทาง ระยะทาง (Distance) เวลาเดินทาง (Duration) และพิกัดภูมิศาสตร์ (Geometries/Legs)

---

## โครงสร้างโปรเจกต์ (Project Structure)

```text
Angular_FinalProject/
├── angular-ui/                            # โปรเจกต์ส่วน Frontend ด้วย Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/                # คอมโพเนนต์ UI ที่ใช้ร่วมกัน
│   │   │   │   ├── header/                # คอมโพเนนต์แถบเมนูด้านบน
│   │   │   │   └── map-view/              # คอมโพเนนต์แสดงผลแผนที่
│   │   │   ├── config/                    # ตั้งค่าแอปพลิเคชันและ API Endpoints
│   │   │   │   └── api.ts                 # กำหนด URL Endpoint ของ API
│   │   │   ├── pages/                     # หน้าหลักต่าง ๆ ของแอปพลิเคชัน
│   │   │   │   ├── customer-management/   # หน้าสำหรับจัดการข้อมูลลูกค้า
│   │   │   │   ├── map/                   # หน้าแผนที่เส้นทางและการคำนวนหากำไร ขาดทุน ต้นทุนต่างๆ
│   │   │   │   ├── order-management/      # หน้าจัดการออเดอร์
│   │   │   │   └── rider/                 # หน้าจัดการข้อมูลไรเดอร์
│   │   │   ├── app.config.ts              # ตั้งค่าหลักและ Providers ของ Angular
│   │   │   ├── app.css                    # สไตล์ชีทสำหรับ Root Component
│   │   │   ├── app.html                   # แม่แบบโครงสร้าง HTML ของ Root Component
│   │   │   ├── app.routes.ts              # กำหนดเส้นทางหน้าเว็บ (Routing)
│   │   │   ├── app.spec.ts                # ไฟล์ทดสอบ Unit Test ของ Root Component
│   │   │   └── app.ts                     # คลาสหลักของ Root Component
│   │   ├── Model/                         # อินเทอร์เฟซข้อมูล (WorkJob, RouteStop, Coordinate ฯลฯ)
│   │   ├── service/                       # บริการจัดการข้อมูลและเชื่อมต่อ API (RoutesAMapService ฯลฯ)
│   │   ├── Util/                          # ฟังก์ชันคำนวณลอจิกและฟังก์ชันช่วย (delivery-calculator.ts)
│   │   ├── index.html                     # ไฟล์ HTML หลัก (Entry Point)
│   │   ├── main.ts                        # จุดเริ่มต้นในการเริ่มทำงานแอปพลิเคชัน (Bootstrap Entry)
│   │   ├── styles.css                     # สไตล์ชีทส่วนกลางของทั้งโปรเจกต์
│   │   ├── .editorconfig                  # ไฟล์ตั้งค่าฟอร์แมตโค้ดของ Editor
│   │   └── .gitignore                     # ไฟล์กำหนดรายการที่ไม่ต้องการดันขึ้น Git
│   └── package.json
│
└── README.md                              # เอกสารอธิบายโปรเจกต์
```

---

## วิธีการติดตั้งและรันโปรเจกต์บน Local (Local Setup Guide)

### สิ่งที่ต้องเตรียมก่อนติดตั้ง (Prerequisites)
- [Node.js](https://nodejs.org/) (v18.x หรือใหม่กว่า)
- [MySQL Server](https://www.mysql.com/) หรือ XAMPP/WAMP
- [Angular CLI](https://angular.dev/) (`npm install -g @angular/cli`)

---

### 1. การตั้งค่าฐานข้อมูล (Database Setup)
1. เปิดโปรแกรมจัดการฐานข้อมูล (เช่น phpMyAdmin, MySQL Workbench, DBeaver)
2. สร้างฐานข้อมูลใหม่ ชื่อ `delivery_db` (หรือตามที่ระบุในไฟล์ตั้งค่า)
3. นำเข้าไฟล์ SQL Schema และข้อมูลเริ่มต้นสำหรับการทดสอบ

---

### 2. การติดตั้งและรัน Backend (Node.js Express)

1. เปิด Terminal และเข้าไปยังโฟลเดอร์ Backend:
   ```bash
   cd backend
   ```
2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```
3. สร้างไฟล์ `.env` สำหรับตั้งค่าการเชื่อมต่อฐานข้อมูล:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=
   DB_NAME=delivery_db
   ```
4. เริ่มต้นทำงานระบบ Backend:
   ```bash
   npm start
   # หรือ node server.js
   ```
   *ระบบ Backend จะรันที่: `http://localhost:3000`*

---

### 3. การติดตั้งและรัน Frontend (Angular UI)

1. เปิด Terminal ใหม่ และเข้าไปยังโฟลเดอร์ Frontend:
   ```bash
   cd angular-ui
   ```
2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```
3. สั่งรัน Angular Development Server:
   ```bash
   ng serve --open
   ```
4. เปิดเบราว์เซอร์เข้าใช้งานระบบที่: `http://localhost:4200`

---

## รายละเอียดโมดูลและฟังก์ชันการทำงาน (System Modules & Features)

### 1. ระบบฝั่งเจ้าของร้าน (Owner System)

#### **หน้า 1: หน้าจัดการข้อมูลลูกค้า (Customer Management)**
- **การจำลองข้อมูล:** ใช้สำหรับจำลองข้อมูลลูกค้าเพื่อนำไปผูกกับออเดอร์ในหน้าจัดการออเดอร์
- **จัดการข้อมูล (CRUD):** เพิ่ม, ลบ, แก้ไข และค้นหาข้อมูลลูกค้าได้อย่างสะดวก
- **ปักพิกัดแผนที่:** แสดงผลแผนที่แบบ Interactive สามารถคลิกปักหมุดเพื่อระบุพิกัดละติจูด/ลองจิจูด (Latitude/Longitude) ของลูกค้าได้

#### **หน้า 2: หน้าจัดการข้อมูลออเดอร์ (Order Management)**
- **จัดการข้อมูล (CRUD):** ฟังก์ชันพื้นฐานเหมือนหน้า 1 (เพิ่ม, ลบ, แก้ไข, ค้นหา)
- **การสร้างออเดอร์ในใบงาน:**
  - รับข้อมูลจำนวนข้าวกล่อง และจำนวนออเดอร์
  - อ้างอิงลูกค้าด้วย **รหัสลูกค้า (Customer ID)** โดยไม่ต้องกรอกข้อมูลชื่อ/ที่อยู่ซ้ำ

#### **หน้า 3: หน้าคำนวณเส้นทางและแผนที่ (Route Calculation & Map View)**
- **แสดงเส้นทางไรเดอร์:** แสดงเส้นทางจัดส่งของไรเดอร์แต่ละคนบนแผนที่ โดยใช้อักษรและสีแยกแตกต่างกันในแต่ละเส้นทาง
- **รายการออเดอร์:** แสดงรายการออเดอร์ทั้งหมด ผู้ใช้งานสามารถกดคลิกเข้าไปดูรายละเอียดของแต่ละออเดอร์ได้
- **การเลือกเส้นทางใหม่:** มีปุ่มคำนวณ/กดเลือกเส้นทางจัดส่งใหม่ได้ทันที

#### **หน้ารายละเอียดใบงานและการวิเคราะห์ต้นทุน (Job Details & Profit/Loss Analysis)**
- **คำนวณค่าใช้จ่าย:** คำนวณค่าส่งตามระยะทางจริง ต้นทุนอาหาร ยอดขายรวม
- **วิเคราะห์ผลกำไร-ขาดทุน:** คำนวณและสรุปกำไรสุทธิ (Net Profit) หรือผลขาดทุน พร้อม Margin % และแจ้งเตือนเมื่อเกิดภาวะขาดทุน

---

### 🛵 2. ระบบฝั่งไรเดอร์ (Rider System)

#### **หน้าจอแสดงงานของไรเดอร์ (Rider View)**
- **ค้นหาตาม Job ID:** ไรเดอร์กรอก ID ของใบงานที่ได้รับมอบหมายเพื่อดึงข้อมูลใบงานของตนเอง
- **แผนที่นำทาง:** มีปุ่มกดดูแผนที่นำทางแบบเต็มจอ
- **Bottom Sheet รายละเอียด:** สามารถเลื่อน/ปัดหน้าจอขึ้น (Swipe Up) เพื่อดูรายละเอียดออเดอร์ ข้าวกล่อง และสถานที่จัดส่งทั้งหมดในใบงานได้

---

## ทีมงานและหน้าที่รับผิดชอบ (Team & Responsibilities)


| **1** | [นางสาวกัญญานัฐ  ท้าวจัตุรัส] | `67011212078` | **Customer & Order Management** | **หน้า จัดการข้อมูลลูกค้า (CRUD และแสดงแผนที่พร้อมปักหมุดพิกัด)<br> **หน้าจัดการข้อมูลออเดอร์ จำลองออเดอร์ และผูกรหัสลูกค้า (Customer ID) เข้ากับใบงานโดยไม่ต้องกรอกซ้ำ |
| **2** | [นายธาดา  ทองอ่อน] | `67011212035` | **GIS Map & Route Generation** | **หน้า map ส่วนแผนที่ & คำนวณเส้นทาง**: วาดเส้นทางไรเดอร์บนแผนที่แยกสีตามแต่ละเส้น และการเลือก/สร้างใบงานเส้นทางใหม่<br>- เชื่อมต่อ OSRM API (`RoutesAMapService`) เพื่อคำนวณเส้นทางและระยะทางของไรเดอร์ |
| **3** | [นางสาวจุฑารัตน์  พินธุกรณ์] | `67011212012` | **Financial & Profit Calculation Engine** | - **หน้า mapส่วนการคำนวณค่า**: วิเคราะห์ต้นทุนอาหาร รายรับสุทธิ กำไร/ขาดทุนสุทธิ
| **4** | [นายปภังกร วิเศษศรี] | `67011212045` | **Rider System & Application View** | **หน้าระบบฝั่งไรเดอร์**: ระบบค้นหาด้วย Job ID แสดงหน้ารายละเอียดใบงานของไรเดอร์และระบบนำทาง

---

## หมายเหตุการใช้งาน (Notes & Troubleshooting)

- **Cannot GET / บน Port 3000**: เป็นพฤติกรรมปกติของ Express หากไม่ได้ตั้งค่า Route หน้าแรก (`/`) ไว้ ให้เรียกใช้งานผ่าน API Path เช่น `http://localhost:3000/api/...`
- **OSRM API Caching**: ใน `RoutesAMapService` มีระบบ Cache พิกัด เพื่อป้องกันการส่งคำขอถี่เกินไปและลดโหลดของเครือข่าย

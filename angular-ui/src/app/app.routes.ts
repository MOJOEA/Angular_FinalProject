import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Map } from './pages/map/map';
/* import { Detail } from './pages/detail/detail'; */
import { Rider } from './pages/rider/rider';
export const routes: Routes = [
    { 
        path: '', component: Main,
    },{
        path: 'map', component: Map
    },/* ,{
        path: 'detail/:id', //  เพิ่ม Path สำหรับหน้ารายละเอียด
        component: Detail   //  ใช้ชื่อ Class ตามที่ export ไว้ใน detail.ts
    } */
    {
        path: 'rider', component: Rider
    }

];
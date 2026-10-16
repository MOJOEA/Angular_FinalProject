import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Map } from './pages/map/map';
export const routes: Routes = [
    { 
        path: '', component: Main,
    },{
        path: 'map', component: Map
    }
import { CustomerManagement } from './pages/customer-management/customer-management';
import { OrderManagement } from './pages/order-management/order-management';

export const routes: Routes = [
  { path: '', component: Main },
  { path: 'customer', component: CustomerManagement },
  { path: 'order', component: OrderManagement },
  { path: 'map', component: Map },
];
import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Map } from './pages/map/map';
import { Rider } from './pages/rider/rider';
import { CustomerManagement } from './pages/customer-management/customer-management';
import { OrderManagement } from './pages/order-management/order-management';

export const routes: Routes = [
    { path: '', component: Main },
    { path: 'map', component: Map },
    { path: 'rider', component: Rider },
    { path: 'customer', component: CustomerManagement },
    { path: 'order', component: OrderManagement },
    { path: 'map', component: Map },
];

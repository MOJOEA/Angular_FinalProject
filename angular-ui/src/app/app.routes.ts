import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Map } from './pages/map/map';
import { CustomerManagement } from './pages/customer-management/customer-management';

export const routes: Routes = [
  { path: '', component: Main },
  { path: 'customer', component: CustomerManagement },
  { path: 'map', component: Map },
];
import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Map } from './pages/map/map';

export const routes: Routes = [
    { 
        path: '', component: Main,
    },{
        path: 'map', component: Map
    }
];
import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Map } from './pages/map/map';
import { Rider } from './pages/rider/rider';

export const routes: Routes = [
    { 
        path: '', component: Main,
    },{
        path: 'map', component: Map
    },{
        path: 'rider', component: Rider
    }
];
import { Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './main.html',
  styleUrl: './main.css'
})
export class Main{
  
}

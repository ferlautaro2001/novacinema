import { Component } from '@angular/core';

@Component({
  selector: 'nc-pie',
  templateUrl: './pie.html',
  styleUrl: './pie.css',
})
export class Pie {
  protected readonly anio = new Date().getFullYear();
}

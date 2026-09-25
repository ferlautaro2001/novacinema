import { Component, input, OnChanges, OnInit, output, signal } from '@angular/core';
import {
  diasConsecutivos,
  etiquetaDia,
  fechaLarga,
  inicioDelDia,
  mesesDe,
  mismoDia,
  sumarDias,
} from '../../utilidades/fechas';

interface OpcionDia {
  fecha: Date;
  etiqueta: string;
  descripcion: string;
}

const DIAS_POR_SEMANA = 7;

// 7 botones de días seguidos desde hoy y se avanza de a una semana. Reemplaza al
// calendario, que el enunciado prohíbe.
@Component({
  selector: 'nc-selector-fecha',
  templateUrl: './selector-fecha.html',
  styleUrl: './selector-fecha.css',
})
export class SelectorFecha implements OnInit, OnChanges {
  fechaInicial = input('');
  fechaElegida = output<Date>();

  dias = signal<OpcionDia[]>([]);
  meses = signal('');
  elegida = signal<Date | null>(null);
  esPrimeraSemana = signal(true);

  private hoy = inicioDelDia(new Date());
  private desde = this.hoy;

  ngOnInit(): void {
    // Tomo "hoy" acá y no al construir la clase, así una pantalla que quedó abierta
    // de un día para otro arranca en el día correcto al volver a entrar.
    this.hoy = inicioDelDia(new Date());
    this.actualizarFecha();
  }

  ngOnChanges(): void {
    this.actualizarFecha();
  }

  semanaSiguiente(): void {
    this.mostrarSemana(sumarDias(this.desde, DIAS_POR_SEMANA));
  }

  semanaAnterior(): void {
    this.mostrarSemana(sumarDias(this.desde, -DIAS_POR_SEMANA));
  }

  elegir(dia: OpcionDia): void {
    this.elegida.set(dia.fecha);
    this.fechaElegida.emit(dia.fecha);
  }

  estaElegida(dia: OpcionDia): boolean {
    const elegida = this.elegida();
    return elegida !== null && mismoDia(elegida, dia.fecha);
  }

  private actualizarFecha(): void {
    const iso = this.fechaInicial();
    if (!iso) {
      this.elegida.set(null);
      this.mostrarSemana(this.hoy);
      return;
    }

    const fecha = inicioDelDia(new Date(iso + 'T12:00:00'));
    this.elegida.set(fecha);
    this.mostrarSemana(fecha > this.hoy ? fecha : this.hoy);
  }

  private mostrarSemana(desde: Date): void {
    // Nunca antes de hoy: con este selector no se eligen fechas pasadas.
    this.desde = desde < this.hoy ? this.hoy : desde;

    const fechas = diasConsecutivos(this.desde, DIAS_POR_SEMANA);
    const dias: OpcionDia[] = [];
    for (const fecha of fechas) {
      dias.push({ fecha, etiqueta: etiquetaDia(fecha, this.hoy), descripcion: fechaLarga(fecha) });
    }

    this.dias.set(dias);
    this.meses.set(mesesDe(fechas));
    this.esPrimeraSemana.set(mismoDia(this.desde, this.hoy));
  }
}

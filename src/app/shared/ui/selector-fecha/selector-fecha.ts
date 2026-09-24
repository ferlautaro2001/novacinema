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

// Selector rápido de fecha: 7 botones de días consecutivos desde hoy, y se avanza
// de a una semana. Reemplaza al calendario mensual, que el enunciado prohíbe.
@Component({
  selector: 'nc-selector-fecha',
  templateUrl: './selector-fecha.html',
  styleUrl: './selector-fecha.css',
})
export class SelectorFecha implements OnInit, OnChanges {
  readonly fechaInicial = input('');
  readonly fechaElegida = output<Date>();

  protected readonly dias = signal<OpcionDia[]>([]);
  protected readonly meses = signal('');
  protected readonly elegida = signal<Date | null>(null);
  protected readonly esPrimeraSemana = signal(true);

  private hoy = inicioDelDia(new Date());
  private desde = this.hoy;

  ngOnInit(): void {
    // Tomo "hoy" al crearse y no al construir la clase, así una pantalla que queda
    // abierta de un día para otro arranca en el día correcto al volver a entrar.
    this.hoy = inicioDelDia(new Date());
    this.actualizarFecha();
  }

  ngOnChanges(): void {
    this.actualizarFecha();
  }

  private actualizarFecha(): void {
    const iso = this.fechaInicial();
    const fecha = iso ? inicioDelDia(new Date(iso + 'T12:00:00')) : null;
    this.elegida.set(fecha);
    this.mostrarSemana(fecha && fecha > this.hoy ? fecha : this.hoy);
  }

  protected semanaSiguiente(): void {
    this.mostrarSemana(sumarDias(this.desde, DIAS_POR_SEMANA));
  }

  protected semanaAnterior(): void {
    this.mostrarSemana(sumarDias(this.desde, -DIAS_POR_SEMANA));
  }

  protected elegir(dia: OpcionDia): void {
    this.elegida.set(dia.fecha);
    this.fechaElegida.emit(dia.fecha);
  }

  protected estaElegida(dia: OpcionDia): boolean {
    const elegida = this.elegida();
    return elegida !== null && mismoDia(elegida, dia.fecha);
  }

  private mostrarSemana(desde: Date): void {
    // Nunca antes de hoy: no se eligen fechas pasadas con este selector.
    this.desde = desde < this.hoy ? this.hoy : desde;
    const fechas = diasConsecutivos(this.desde, DIAS_POR_SEMANA);
    this.dias.set(
      fechas.map((fecha) => ({
        fecha,
        etiqueta: etiquetaDia(fecha, this.hoy),
        descripcion: fechaLarga(fecha),
      })),
    );
    this.meses.set(mesesDe(fechas));
    this.esPrimeraSemana.set(mismoDia(this.desde, this.hoy));
  }
}

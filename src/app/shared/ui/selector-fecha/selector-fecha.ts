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
    const siguiente = sumarDias(this.desde, DIAS_POR_SEMANA);
    this.mostrarSemana(siguiente);
  }

  semanaAnterior(): void {
    const anterior = sumarDias(this.desde, -DIAS_POR_SEMANA);
    this.mostrarSemana(anterior);
  }

  elegir(dia: OpcionDia): void {
    this.elegida.set(dia.fecha);
    this.fechaElegida.emit(dia.fecha);
  }

  estaElegida(dia: OpcionDia): boolean {
    const elegida = this.elegida();

    let bandera = false;

    if (elegida !== null && mismoDia(elegida, dia.fecha)) {
      bandera = true;
    }

    return bandera;
  }

  private actualizarFecha(): void {
    const iso = this.fechaInicial();

    if (iso !== '') {
      const mediodia = new Date(iso + 'T12:00:00');
      const fecha = inicioDelDia(mediodia);
      this.elegida.set(fecha);

      let desde = this.hoy;

      if (fecha > this.hoy) {
        desde = fecha;
      }

      this.mostrarSemana(desde);
    } else {
      this.elegida.set(null);
      this.mostrarSemana(this.hoy);
    }
  }

  private mostrarSemana(desde: Date): void {
    // Nunca antes de hoy: con este selector no se eligen fechas pasadas.
    let inicio = desde;

    if (desde < this.hoy) {
      inicio = this.hoy;
    }

    this.desde = inicio;

    const fechas = diasConsecutivos(this.desde, DIAS_POR_SEMANA);
    const dias: OpcionDia[] = [];

    for (const fecha of fechas) {
      const etiqueta = etiquetaDia(fecha, this.hoy);
      const descripcion = fechaLarga(fecha);
      dias.push({ fecha, etiqueta, descripcion });
    }

    const meses = mesesDe(fechas);
    const esPrimeraSemana = mismoDia(this.desde, this.hoy);

    this.dias.set(dias);
    this.meses.set(meses);
    this.esPrimeraSemana.set(esPrimeraSemana);
  }
}

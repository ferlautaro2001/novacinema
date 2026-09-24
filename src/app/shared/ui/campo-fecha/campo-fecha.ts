import { Component, input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MESES_DEL_ANIO } from '../../utilidades/fechas';

export type GrupoFecha = FormGroup<{
  dia: FormControl<string>;
  mes: FormControl<string>;
  anio: FormControl<string>;
}>;

// Fecha en tres partes: día y año escritos a mano, mes en un desplegable. No es un
// calendario (el enunciado los prohíbe): se escribe rápido y sin buscar.
// Recibe el FormGroup y proyecta los mensajes de error, como nc-campo-texto.
@Component({
  selector: 'nc-campo-fecha',
  imports: [ReactiveFormsModule],
  host: { '[attr.id]': 'null' },
  templateUrl: './campo-fecha.html',
  styleUrl: './campo-fecha.css',
})
export class CampoFecha implements OnInit, OnDestroy {
  id = input.required<string>();
  etiqueta = input.required<string>();
  grupo = input.required<GrupoFecha>();
  // true cuando es la fecha de nacimiento: activa el autocompletado del navegador.
  nacimiento = input(false);

  meses = MESES_DEL_ANIO;
  mostrarErrores = signal(false);
  private suscripciones: Subscription[] = [];

  ngOnInit(): void {
    this.actualizar();
    // Escucho el grupo y también cada parte: una vez que el grupo quedó "touched",
    // tocar las otras partes ya no dispara eventos en el grupo.
    const { dia, mes, anio } = this.grupo().controls;
    this.suscripciones = [this.grupo(), dia, mes, anio].map((control) =>
      control.events.subscribe(() => this.actualizar()),
    );
  }

  ngOnDestroy(): void {
    this.suscripciones.forEach((s) => s.unsubscribe());
  }

  // Solo números: si se escribe o se pega otra cosa, se descarta en el momento.
  soloNumeros(evento: Event, parte: 'dia' | 'anio', largo: number): void {
    const campo = evento.target as HTMLInputElement;
    const limpio = campo.value.replace(/\D/g, '').slice(0, largo);
    if (limpio !== campo.value) {
      this.grupo().controls[parte].setValue(limpio);
    }
  }

  // El día se puede escribir "1": al salir del campo se guarda como "01".
  completarDia(): void {
    const dia = this.grupo().controls.dia;
    if (/^[1-9]$/.test(dia.value)) dia.setValue(`0${dia.value}`);
  }

  // Los errores aparecen cuando pasó por las tres partes (o intentó enviar), no
  // apenas sale del día con el mes todavía sin elegir.
  private actualizar(): void {
    const { dia, mes, anio } = this.grupo().controls;
    this.mostrarErrores.set(dia.touched && mes.touched && anio.touched && this.grupo().invalid);
  }
}

import { Component, input } from '@angular/core';

// Botón "Avisarme" de Próximamente (US-06.08).
@Component({
  selector: 'nc-boton-alerta',
  templateUrl: './boton-alerta.html',
  styleUrl: './boton-alerta.css',
})
export class BotonAlerta {
  peliculaId = input.required<string>();
  titulo = input.required<string>();
}

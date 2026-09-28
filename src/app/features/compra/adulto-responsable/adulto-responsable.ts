import { Component, inject, input, OnInit, output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CampoFecha, type GrupoFecha } from '../../../shared/ui/campo-fecha/campo-fecha';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { FocoInicial } from '../../../shared/directivas/foco-inicial';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';
import { fechaPorPartes, isoDePartes } from '../../../shared/validadores/fecha-por-partes';
import { esMayorDeEdad } from '../../../shared/validadores/edad-minima';

// Los datos del adulto tal como viajan a la compra. La fecha va en ISO
// ("1980-05-05"), que es lo que la base entiende para una columna date.
export interface DatosAdulto {
  nombre: string;
  apellido: string;
  documento: string;
  fechaNacimiento: string;
}

// El formulario del adulto responsable (US-07.03). Vive dentro del modal que lo
// ofrece: no abre ni cierra nada, solo avisa con confirmado cuando los datos
// están bien.
@Component({
  selector: 'nc-adulto-responsable',
  imports: [ReactiveFormsModule, CampoFecha, CampoTexto, ErrorCampo, FocoInicial],
  templateUrl: './adulto-responsable.html',
  styleUrl: './adulto-responsable.css',
})
export class AdultoResponsable implements OnInit {
  private fb = inject(FormBuilder).nonNullable;

  // La fecha de la función: el adulto tiene que tener 18 cumplidos ese día,
  // no hoy.
  fechaFuncion = input.required<Date>();
  confirmado = output<DatosAdulto>();

  form!: FormGroup<{
    nombre: FormControl<string>;
    apellido: FormControl<string>;
    documento: FormControl<string>;
    nacimiento: GrupoFecha;
  }>;

  ngOnInit(): void {
    const fecha = this.fechaFuncion();

    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      documento: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      nacimiento: this.fb.group(
        {
          dia: [''],
          mes: [''],
          anio: [''],
        },
        {
          validators: [fechaPorPartes({ soloAnteriorAHoy: true }), esMayorDeEdad(fecha)],
        },
      ),
    });
  }

  confirmar(): void {
    const form = this.form;

    if (form.valid) {
      const valores = form.getRawValue();
      const datos: DatosAdulto = {
        nombre: valores.nombre.trim(),
        apellido: valores.apellido.trim(),
        documento: valores.documento,
        fechaNacimiento: isoDePartes(valores.nacimiento),
      };

      this.confirmado.emit(datos);
    } else {
      form.markAllAsTouched();
    }
  }
}

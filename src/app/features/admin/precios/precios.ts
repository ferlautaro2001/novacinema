import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CatalogoService } from '../../../core/data/catalogo-service';
import { PreciosService } from '../../../core/data/precios-service';
import { FormularioConCambios } from '../../../core/guards/cambios-pendientes-guard';
import { Formato } from '../../../core/models/catalogo';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';
import { MENSAJE_VIP_MAYOR, vipMayorQueComun } from '../../../shared/validadores/mayor-que';

// Ids de tipos_butaca. La accesible no tiene tarifa propia: paga la común.
const COMUN = 1;
const VIP = 2;

@Component({
  selector: 'nc-precios',
  imports: [ReactiveFormsModule, CurrencyPipe, CampoTexto, ErrorCampo],
  templateUrl: './precios.html',
  styleUrl: './precios.css',
})
export class Precios implements OnInit, FormularioConCambios {
  private fb = inject(FormBuilder).nonNullable;
  private preciosS = inject(PreciosService);
  private catalogo = inject(CatalogoService);

  form = this.fb.group(
    {
      comun: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
      vip: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
      adicionales: new FormArray<FormControl<number | null>>([]),
    },
    { validators: vipMayorQueComun },
  );

  mensajeVip = MENSAJE_VIP_MAYOR;
  formatos = signal<Formato[]>([]);
  tarifas = signal(new Map<number, number>());
  adicionales = signal(new Map<number, number>());

  cargando = signal(true);
  guardando = signal(false);
  aviso = signal('');
  error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const formatos = await this.catalogo.findAllFormatos();
      this.formatos.set(formatos.filter((f) => f.activo));
      await this.cargarVigentes();
    } catch {
      this.error.set(
        'No se pudieron cargar las tarifas. Recargá la página para volver a intentarlo.',
      );
    } finally {
      this.cargando.set(false);
    }
  }

  noGuardado(): boolean {
    return this.form.dirty;
  }

  // Lleno el formulario con lo vigente; si todavía no hay nada, los campos quedan vacíos.
  private async cargarVigentes(): Promise<void> {
    const tarifas = await this.preciosS.tarifasVigentes();
    const adicionales = await this.preciosS.adicionalesVigentes();
    this.tarifas.set(tarifas);
    this.adicionales.set(adicionales);

    this.form.controls.comun.setValue(tarifas.get(COMUN) ?? null);
    this.form.controls.vip.setValue(tarifas.get(VIP) ?? null);
    this.form.controls.adicionales.clear();
    for (const formato of this.formatos()) {
      this.form.controls.adicionales.push(
        this.fb.control<number | null>(adicionales.get(formato.id) ?? null, [
          Validators.required,
          Validators.min(0),
        ]),
      );
    }
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  sinTarifas(): boolean {
    return this.tarifas().size === 0;
  }

  comunVigente(): number | null {
    return this.tarifas().get(COMUN) ?? null;
  }

  vipVigente(): number | null {
    return this.tarifas().get(VIP) ?? null;
  }

  adicionalVigente(formatoId: number): number | null {
    return this.adicionales().get(formatoId) ?? null;
  }

  // El error del grupo lo muestro recién cuando la persona tocó la tarifa VIP.
  vipInvalida(): boolean {
    return this.form.hasError('vipMayorQueComun') && this.form.controls.vip.touched;
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    this.aviso.set('');
    this.error.set('');
    if (this.form.invalid) return;

    const valores = this.form.getRawValue();
    const tarifas = new Map<number, number>();
    tarifas.set(COMUN, Number(valores.comun));
    tarifas.set(VIP, Number(valores.vip));

    const adicionales = new Map<number, number>();
    this.formatos().forEach((formato, i) => {
      adicionales.set(formato.id, Number(valores.adicionales[i]));
    });

    this.guardando.set(true);
    try {
      const cambios = await this.preciosS.guardar(tarifas, adicionales);
      await this.cargarVigentes();
      if (cambios === 0) {
        this.aviso.set('No cambiaste ningún valor: las tarifas siguen igual.');
      } else {
        this.aviso.set('Tarifas guardadas. Rigen desde ahora para las entradas que se vendan.');
      }
    } catch {
      this.error.set('No se pudieron guardar las tarifas. Probá de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }
}

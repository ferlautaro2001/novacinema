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
      const activos = formatos.filter(estaActivo);
      this.formatos.set(activos);
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
    const bandera = this.form.dirty;

    return bandera;
  }

  // Lleno el formulario con lo vigente; si todavía no hay nada, los campos quedan vacíos.
  private async cargarVigentes(): Promise<void> {
    const tarifas = await this.preciosS.tarifasVigentes();
    const adicionales = await this.preciosS.adicionalesVigentes();
    this.tarifas.set(tarifas);
    this.adicionales.set(adicionales);

    const comun = buscarValor(tarifas, COMUN);
    const vip = buscarValor(tarifas, VIP);
    this.form.controls.comun.setValue(comun);
    this.form.controls.vip.setValue(vip);
    this.form.controls.adicionales.clear();
    for (const formato of this.formatos()) {
      const adicional = buscarValor(adicionales, formato.id);
      const control = this.fb.control<number | null>(adicional, [
        Validators.required,
        Validators.min(0),
      ]);
      this.form.controls.adicionales.push(control);
    }
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  sinTarifas(): boolean {
    let bandera = false;

    if (this.tarifas().size === 0) {
      bandera = true;
    }

    return bandera;
  }

  comunVigente(): number | null {
    const tarifa = buscarValor(this.tarifas(), COMUN);

    return tarifa;
  }

  vipVigente(): number | null {
    const tarifa = buscarValor(this.tarifas(), VIP);

    return tarifa;
  }

  adicionalVigente(formatoId: number): number | null {
    const adicional = buscarValor(this.adicionales(), formatoId);

    return adicional;
  }

  // El error del grupo lo muestro recién cuando la persona tocó la tarifa VIP.
  vipInvalida(): boolean {
    let bandera = false;

    if (this.form.hasError('vipMayorQueComun') && this.form.controls.vip.touched) {
      bandera = true;
    }

    return bandera;
  }

  async guardar(): Promise<void> {
    if (this.guardando() === false) {
      this.form.markAllAsTouched();
      this.aviso.set('');
      this.error.set('');

      if (this.form.invalid === false) {
        await this.guardarTarifas();
      }
    }
  }

  private async guardarTarifas(): Promise<void> {
    const valores = this.form.getRawValue();
    const tarifas = new Map<number, number>();
    tarifas.set(COMUN, Number(valores.comun));
    tarifas.set(VIP, Number(valores.vip));

    const adicionales = new Map<number, number>();
    let indice = 0;

    for (const formato of this.formatos()) {
      adicionales.set(formato.id, Number(valores.adicionales[indice]));
      indice++;
    }

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

// ─── Auxiliares ─────────────────────────────────────────────────────

function estaActivo(formato: Formato): boolean {
  const activo = formato.activo;

  return activo;
}

function buscarValor(mapa: Map<number, number>, clave: number): number | null {
  let valor: number | null = null;
  const encontrado = mapa.get(clave);

  if (encontrado !== undefined) {
    valor = encontrado;
  }

  return valor;
}

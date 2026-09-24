import { Component, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { fechaPorPartes } from '../../validadores/fecha-por-partes';
import { ErrorCampo } from '../error-campo/error-campo';
import { CampoFecha } from './campo-fecha';

@Component({
  imports: [ReactiveFormsModule, CampoFecha, ErrorCampo],
  template: `
    <nc-campo-fecha id="nac" etiqueta="Fecha de nacimiento" [nacimiento]="true" [grupo]="grupo">
      <nc-error-campo [control]="grupo" error="fechaIncompleta">Completá la fecha</nc-error-campo>
      <nc-error-campo [control]="grupo" error="diaInvalido">Día inválido</nc-error-campo>
      <nc-error-campo [control]="grupo" error="anioFueraDeRango">Año fuera de rango</nc-error-campo>
      <nc-error-campo [control]="grupo" error="fechaInvalida"
        >Ingresá una fecha válida</nc-error-campo
      >
    </nc-campo-fecha>
  `,
})
class FormularioFecha {
  grupo = inject(FormBuilder).nonNullable.group(
    { dia: '', mes: '', anio: '' },
    { validators: fechaPorPartes({ soloAnteriorAHoy: true }) },
  );
}

describe('CampoFecha', () => {
  let fixture: ComponentFixture<FormularioFecha>;
  let raiz: HTMLElement;

  const dia = () => raiz.querySelector<HTMLInputElement>('#nac-dia')!;
  const mes = () => raiz.querySelector<HTMLSelectElement>('#nac-mes')!;
  const anio = () => raiz.querySelector<HTMLInputElement>('#nac-anio')!;
  const errores = () => raiz.querySelector('#nac-errores')!.textContent!.trim();
  const grupo = () => fixture.componentInstance.grupo;

  async function escribir(campo: HTMLInputElement, valor: string): Promise<void> {
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function salir(campo: HTMLElement): Promise<void> {
    campo.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function elegirMes(valor: string): Promise<void> {
    mes().value = valor;
    mes().dispatchEvent(new Event('change'));
    await salir(mes());
  }

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 30));
    fixture = TestBed.createComponent(FormularioFecha);
    raiz = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => vi.useRealTimers());

  it('tiene día y año escritos y el mes en un desplegable con los 12 meses', () => {
    expect(raiz.querySelector('legend')?.textContent).toContain('Fecha de nacimiento');
    expect(dia().getAttribute('inputmode')).toBe('numeric');
    expect(anio().getAttribute('inputmode')).toBe('numeric');
    const opciones = Array.from(mes().options).filter((o) => !o.disabled);
    expect(opciones).toHaveLength(12);
    expect(opciones[0].value).toBe('01');
    expect(opciones[0].textContent).toContain('Enero');
    expect(opciones[11].value).toBe('12');
    expect(raiz.querySelector('input[type=date], table, [role=grid]')).toBeNull();
  });

  it('solo deja escribir números en el día y el año', async () => {
    await escribir(dia(), '1a');
    await escribir(anio(), '19x9-0');

    expect(grupo().value.dia).toBe('1');
    expect(grupo().value.anio).toBe('1990');
  });

  it('completa el 0 del día al salir del campo', async () => {
    await escribir(dia(), '4');
    await salir(dia());
    expect(grupo().value.dia).toBe('04');

    await escribir(dia(), '14');
    await salir(dia());
    expect(grupo().value.dia).toBe('14');
  });

  it('no convierte el 0 en un día válido', async () => {
    await escribir(dia(), '0');
    await salir(dia());
    await elegirMes('02');
    await escribir(anio(), '1990');
    await salir(anio());

    expect(grupo().value.dia).toBe('0');
    expect(errores()).toBe('Día inválido');
  });

  it('el mes elegido llega como número de dos dígitos', async () => {
    await elegirMes('09');
    expect(grupo().value.mes).toBe('09');
  });

  it('muestra los errores recién después de pasar por las tres partes', async () => {
    await escribir(dia(), '31');
    await salir(dia());
    expect(errores()).toBe('');

    await elegirMes('02');
    expect(errores()).toBe('');

    await escribir(anio(), '2000');
    await salir(anio());
    expect(errores()).toBe('Ingresá una fecha válida');
    expect(raiz.querySelector('fieldset')?.getAttribute('aria-describedby')).toBe('nac-errores');
  });

  it('marca el año fuera de rango', async () => {
    await escribir(dia(), '14');
    await salir(dia());
    await elegirMes('02');
    await escribir(anio(), '1850');
    await salir(anio());

    expect(errores()).toBe('Año fuera de rango');
  });

  it('acepta una fecha completa y válida', async () => {
    await escribir(dia(), '1');
    await salir(dia());
    await elegirMes('02');
    await escribir(anio(), '1990');
    await salir(anio());

    expect(grupo().valid).toBe(true);
    expect(grupo().value).toEqual({ dia: '01', mes: '02', anio: '1990' });
    expect(errores()).toBe('');
  });
});

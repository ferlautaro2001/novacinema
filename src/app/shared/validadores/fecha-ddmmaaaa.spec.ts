import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CampoTexto } from '../ui/campo-texto/campo-texto';
import { ErrorCampo } from '../ui/error-campo/error-campo';
import { fechaDDMMAAAA } from './fecha-ddmmaaaa';

describe('fechaDDMMAAAA (US-01.05)', () => {
  beforeEach(() => {
    // Hoy es 5 de octubre de 2026, como en el criterio de aceptación.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 30));
  });

  afterEach(() => vi.useRealTimers());

  const validar = (valor: string | null, soloAnteriorAHoy = false) =>
    fechaDDMMAAAA({ soloAnteriorAHoy })(new FormControl(valor));

  it('acepta una fecha real', () => {
    expect(validar('14/02/1990', true)).toBeNull();
  });

  it('rechaza formatos distintos y días que no existen', () => {
    expect(validar('31/02/2000')).toEqual({ fechaInvalida: true });
    expect(validar('14-02-1990')).toEqual({ fechaInvalida: true });
    expect(validar('1/2/1990')).toEqual({ fechaInvalida: true });
  });

  it('con soloAnteriorAHoy rechaza hoy y fechas futuras', () => {
    expect(validar('10/10/2026', true)).toEqual({ fechaNoAnterior: true });
    expect(validar('05/10/2026', true)).toEqual({ fechaNoAnterior: true });
    expect(validar('04/10/2026', true)).toBeNull();
    expect(validar('10/10/2026')).toBeNull();
  });

  it('deja pasar el vacío: de eso se ocupa Validators.required', () => {
    expect(validar('')).toBeNull();
    expect(validar(null)).toBeNull();
  });
});

@Component({
  imports: [ReactiveFormsModule, CampoTexto, ErrorCampo],
  template: `
    <nc-campo-texto id="nacimiento" etiqueta="Fecha de nacimiento" [control]="control">
      <nc-error-campo [control]="control" error="fechaInvalida">
        Ingresá una fecha válida
      </nc-error-campo>
      <nc-error-campo [control]="control" error="fechaNoAnterior">
        La fecha debe ser anterior a hoy
      </nc-error-campo>
    </nc-campo-texto>
  `,
})
class CampoNacimiento {
  control = new FormControl('', fechaDDMMAAAA({ soloAnteriorAHoy: true }));
}

describe('fecha de nacimiento escrita (AC-01.05.03)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 30));
  });

  afterEach(() => vi.useRealTimers());

  async function escribirYSalir(valor: string): Promise<string> {
    const fixture = TestBed.createComponent(CampoNacimiento);
    await fixture.whenStable();
    const raiz: HTMLElement = fixture.nativeElement;
    const campo = raiz.querySelector<HTMLInputElement>('#nacimiento')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    return raiz.querySelector('#nacimiento-errores')!.textContent!.trim();
  }

  it('acepta 14/02/1990 sin errores', async () => {
    expect(await escribirYSalir('14/02/1990')).toBe('');
  });

  it('muestra "Ingresá una fecha válida" para 31/02/2000', async () => {
    expect(await escribirYSalir('31/02/2000')).toBe('Ingresá una fecha válida');
  });

  it('muestra "La fecha debe ser anterior a hoy" para 10/10/2026', async () => {
    expect(await escribirYSalir('10/10/2026')).toBe('La fecha debe ser anterior a hoy');
  });
});

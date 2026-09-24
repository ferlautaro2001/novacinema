import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ErrorCampo } from '../error-campo/error-campo';
import { CampoTexto } from './campo-texto';

// Formulario de ejemplo armado como lo va a usar cualquier pantalla: campos con sus
// errores proyectados y el botón de envío atado a form.invalid.
@Component({
  imports: [ReactiveFormsModule, CampoTexto, ErrorCampo],
  template: `
    <form [formGroup]="form" (ngSubmit)="enviar()">
      <nc-campo-texto id="nombre" etiqueta="Nombre" [control]="form.controls.nombre">
        <nc-error-campo [control]="form.controls.nombre" error="required">
          Este campo es obligatorio
        </nc-error-campo>
      </nc-campo-texto>
      <nc-campo-texto id="email" etiqueta="Email" tipo="email" [control]="form.controls.email">
        <nc-error-campo [control]="form.controls.email" error="required">
          Este campo es obligatorio
        </nc-error-campo>
        <nc-error-campo [control]="form.controls.email" error="email">
          Ingresá un email válido
        </nc-error-campo>
      </nc-campo-texto>
      <button type="submit" [disabled]="form.invalid">Enviar</button>
    </form>
  `,
})
class FormularioDePrueba {
  form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: Validators.required }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });
  enviados = 0;

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviados++;
  }
}

describe('CampoTexto (US-01.04)', () => {
  let fixture: ComponentFixture<FormularioDePrueba>;
  let raiz: HTMLElement;

  const campo = (id: string) => raiz.querySelector<HTMLInputElement>(`#${id}`)!;
  const errores = (id: string) => raiz.querySelector(`#${id}-errores`)!.textContent!.trim();
  const boton = () => raiz.querySelector<HTMLButtonElement>('button[type=submit]')!;

  async function escribir(id: string, valor: string): Promise<void> {
    campo(id).value = valor;
    campo(id).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function salir(id: string): Promise<void> {
    campo(id).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(FormularioDePrueba);
    raiz = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('asocia la etiqueta con el campo', () => {
    expect(raiz.querySelector('label[for=nombre]')?.textContent).toContain('Nombre');
    expect(campo('email').type).toBe('email');
    expect(raiz.querySelectorAll('#email')).toHaveLength(1);
  });

  it('no muestra errores en un campo sin tocar (AC-01.04.01)', () => {
    expect(errores('nombre')).toBe('');
    expect(campo('nombre').getAttribute('aria-invalid')).toBe('false');
  });

  it('muestra el error de obligatorio al salir del campo vacío (AC-01.04.01)', async () => {
    campo('nombre').dispatchEvent(new Event('focus'));
    await salir('nombre');

    expect(errores('nombre')).toBe('Este campo es obligatorio');
    expect(campo('nombre').getAttribute('aria-invalid')).toBe('true');
    expect(campo('nombre').getAttribute('aria-describedby')).toBe('nombre-errores');
  });

  it('solo muestra el mensaje del error que tiene el campo', async () => {
    await escribir('email', 'juan@');
    await salir('email');

    expect(errores('email')).toBe('Ingresá un email válido');
  });

  it('bloquea el envío mientras haya un campo inválido (AC-01.04.02)', async () => {
    await escribir('nombre', 'Juan');
    await escribir('email', 'juan@');
    expect(boton().disabled).toBe(true);

    // Enter dentro del formulario también es un intento de envío.
    raiz.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(fixture.componentInstance.enviados).toBe(0);
    expect(errores('email')).toBe('Ingresá un email válido');
  });

  it('habilita el envío cuando todo es válido', async () => {
    await escribir('nombre', 'Juan');
    await escribir('email', 'juan@mail.com');
    expect(boton().disabled).toBe(false);

    boton().click();
    await fixture.whenStable();

    expect(fixture.componentInstance.enviados).toBe(1);
    expect(errores('nombre')).toBe('');
    expect(errores('email')).toBe('');
  });
});

import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  cambiosPendientesGuard,
  FormularioConCambios,
  MENSAJE_CAMBIOS_SIN_GUARDAR,
} from './cambios-pendientes-guard';

// Un formulario de edición cualquiera, como el de una película del Panel.
@Component({
  imports: [ReactiveFormsModule],
  template: `<form [formGroup]="form"><textarea formControlName="sinopsis"></textarea></form>`,
})
class EdicionPelicula implements FormularioConCambios {
  form = inject(FormBuilder).nonNullable.group({
    sinopsis: 'Paul Atreides llega a Arrakis.',
  });
  noGuardado(): boolean {
    return this.form.dirty;
  }
}

@Component({ template: '<h1>Otra sección</h1>' })
class OtraSeccion {}

describe('cambiosPendientesGuard (US-02.06)', () => {
  let harness: RouterTestingHarness;
  let edicion: EdicionPelicula;
  let confirmar: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'editar', component: EdicionPelicula, canDeactivate: [cambiosPendientesGuard] },
          { path: 'otra', component: OtraSeccion },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();
    edicion = await harness.navigateByUrl('/editar', EdicionPelicula);
    confirmar = vi.spyOn(window, 'confirm');
  });

  afterEach(() => confirmar.mockRestore());

  function modificarSinopsis(): void {
    const sinopsis = edicion.form.controls.sinopsis;
    sinopsis.setValue('Sinopsis nueva');
    sinopsis.markAsDirty();
  }

  it('con cambios pregunta antes de salir (AC-02.06.01)', async () => {
    confirmar.mockReturnValue(true);
    modificarSinopsis();

    await harness.navigateByUrl('/otra');

    expect(confirmar).toHaveBeenCalledWith(MENSAJE_CAMBIOS_SIN_GUARDAR);
    expect(MENSAJE_CAMBIOS_SIN_GUARDAR).toBe('Tenés cambios sin guardar. ¿Querés salir igual?');
    expect(TestBed.inject(Router).url).toBe('/otra');
  });

  it('con "Cancelar" se queda en el formulario con los cambios intactos (AC-02.06.01)', async () => {
    confirmar.mockReturnValue(false);
    modificarSinopsis();

    await harness.navigateByUrl('/otra');

    expect(TestBed.inject(Router).url).toBe('/editar');
    expect(edicion.form.controls.sinopsis.value).toBe('Sinopsis nueva');
  });

  it('sin cambios navega sin preguntar (AC-02.06.01)', async () => {
    await harness.navigateByUrl('/otra');

    expect(confirmar).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/otra');
  });
});

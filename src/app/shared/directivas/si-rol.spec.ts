import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SiRol } from './si-rol';

@Component({
  imports: [SiRol],
  template: `
    <ng-template #invitado><p class="sino">Solo para el personal</p></ng-template>
    <div *appSiRol="['empleado', 'administrador']; actual: rol(); sino: invitado">
      <p class="personal">Boletería</p>
    </div>
    <p *appSiRol="['administrador']; actual: rol()" class="panel">Panel</p>
  `,
})
class Anfitrion {
  rol = signal<string | null>(null);
}

describe('SiRol (US-02.05)', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let raiz: HTMLElement;
  const cuantos = (selector: string) => raiz.querySelectorAll(selector).length;

  async function conRol(rol: string | null): Promise<void> {
    fixture.componentInstance.rol.set(rol);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(Anfitrion);
    raiz = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('sin rol muestra el template alternativo y nada más', () => {
    expect(cuantos('.personal')).toBe(0);
    expect(cuantos('.panel')).toBe(0);
    expect(cuantos('.sino')).toBe(1);
  });

  it('muestra cada bloque solo a los roles permitidos', async () => {
    await conRol('empleado');
    expect(cuantos('.personal')).toBe(1);
    expect(cuantos('.panel')).toBe(0);
    expect(cuantos('.sino')).toBe(0);

    await conRol('administrador');
    expect(cuantos('.personal')).toBe(1);
    expect(cuantos('.panel')).toBe(1);

    await conRol('cliente');
    expect(cuantos('.personal')).toBe(0);
    expect(cuantos('.panel')).toBe(0);
    expect(cuantos('.sino')).toBe(1);
  });

  it('no duplica el bloque cuando el rol cambia varias veces', async () => {
    await conRol('empleado');
    await conRol('administrador');
    await conRol('empleado');
    expect(cuantos('.personal')).toBe(1);
  });
});

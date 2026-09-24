import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SiWebgl } from './si-webgl';

@Component({
  standalone: true,
  imports: [SiWebgl],
  template: `
    <button *appSiWebgl="soporta; sino: noWebgl" id="btn-3d">Vista 3D</button>
    <ng-template #noWebgl>
      <button id="btn-no-3d" disabled>3D no disponible en este navegador</button>
    </ng-template>
  `,
})
class TestHostComponent {
  soporta: boolean = true;
}

describe('SiWebgl (AC-04.02.04)', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
  });

  it('muestra el botón 3D cuando WebGL está disponible', () => {
    component.soporta = true;
    fixture.detectChanges();

    const btn3d = fixture.nativeElement.querySelector('#btn-3d');
    const btnNo3d = fixture.nativeElement.querySelector('#btn-no-3d');

    expect(btn3d).not.toBeNull();
    expect(btn3d.textContent).toContain('Vista 3D');
    expect(btnNo3d).toBeNull();
  });

  it('muestra el botón deshabilitado con el aviso cuando no hay WebGL', () => {
    component.soporta = false;
    fixture.detectChanges();

    const btn3d = fixture.nativeElement.querySelector('#btn-3d');
    const btnNo3d = fixture.nativeElement.querySelector('#btn-no-3d');

    expect(btn3d).toBeNull();
    expect(btnNo3d).not.toBeNull();
    expect(btnNo3d.disabled).toBe(true);
    expect(btnNo3d.textContent).toContain('3D no disponible en este navegador');
  });
});

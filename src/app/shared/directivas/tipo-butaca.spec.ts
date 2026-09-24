import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TipoButacaDirective } from './tipo-butaca';
import type { TipoButaca } from '../../core/reglas/butacas';

@Component({
  standalone: true,
  imports: [TipoButacaDirective],
  template: `
    <button [appTipoButaca]="tipo" id="seat">B1</button>
  `,
})
class TestHostComponent {
  tipo: TipoButaca = 'comun';
}

describe('TipoButacaDirective (AC-04.02.03)', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
  });

  it('aplica clase común para tipo comun', () => {
    component.tipo = 'comun';
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('#seat');
    expect(el.classList.contains('t-comun')).toBe(true);
    expect(el.classList.contains('t-vip')).toBe(false);
    expect(el.classList.contains('t-accesible')).toBe(false);
  });

  it('aplica clase VIP para tipo vip', () => {
    component.tipo = 'vip';
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('#seat');
    expect(el.classList.contains('t-vip')).toBe(true);
    expect(el.classList.contains('t-comun')).toBe(false);
  });

  it('aplica clase accesible para tipo accesible', () => {
    component.tipo = 'accesible';
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('#seat');
    expect(el.classList.contains('t-accesible')).toBe(true);
    expect(el.classList.contains('t-vip')).toBe(false);
  });
});

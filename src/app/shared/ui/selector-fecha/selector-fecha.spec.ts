import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectorFecha } from './selector-fecha';

describe('SelectorFecha (US-01.05)', () => {
  let fixture: ComponentFixture<SelectorFecha>;
  let raiz: HTMLElement;
  let emitidas: Date[];

  const opciones = () => Array.from(raiz.querySelectorAll<HTMLButtonElement>('.opcion'));
  const etiquetas = () => opciones().map((b) => b.querySelector('.etiqueta')!.textContent!.trim());
  const boton = (texto: string) =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent!.trim() === texto,
    )!;

  beforeEach(async () => {
    // Lunes 5 de octubre de 2026, como en el criterio de aceptación.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 30));

    fixture = TestBed.createComponent(SelectorFecha);
    raiz = fixture.nativeElement;
    emitidas = [];
    fixture.componentInstance.fechaElegida.subscribe((f) => emitidas.push(f));
    await fixture.whenStable();
  });

  afterEach(() => vi.useRealTimers());

  it('muestra 7 días desde hoy como botones, sin calendario (AC-01.05.01)', () => {
    expect(etiquetas()).toEqual(['Hoy', 'Mañana', 'Mié 7', 'Jue 8', 'Vie 9', 'Sáb 10', 'Dom 11']);
    expect(raiz.querySelector('input[type=date], table, [role=grid]')).toBeNull();
    expect(raiz.textContent).toContain('octubre de 2026');
  });

  it('avanza a la semana siguiente y vuelve (AC-01.05.01)', async () => {
    expect(boton('Semana anterior').disabled).toBe(true);

    boton('Semana siguiente').click();
    await fixture.whenStable();
    expect(etiquetas()).toEqual([
      'Lun 12',
      'Mar 13',
      'Mié 14',
      'Jue 15',
      'Vie 16',
      'Sáb 17',
      'Dom 18',
    ]);
    expect(boton('Semana anterior').disabled).toBe(false);

    boton('Semana anterior').click();
    await fixture.whenStable();
    expect(etiquetas()[0]).toBe('Hoy');
  });

  it('elige un día con un solo toque y lo deja marcado (AC-01.05.02)', async () => {
    opciones()[2].click();
    await fixture.whenStable();

    expect(emitidas).toEqual([new Date(2026, 9, 7)]);
    const marcadas = opciones().filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(marcadas).toHaveLength(1);
    expect(marcadas[0].classList).toContain('elegida');
    expect(marcadas[0].querySelector('.etiqueta')!.textContent).toContain('Mié 7');
  });

  it('da la fecha completa a los lectores de pantalla', () => {
    expect(opciones()[0].textContent).toContain('lunes 5 de octubre');
  });
});

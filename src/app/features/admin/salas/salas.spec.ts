import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SalasService } from '../../../core/data/salas-service';
import type { Sala } from '../../../core/models/sala';
import { Salas } from './salas';

describe('Salas (US-04.01)', () => {
  let fixture: ComponentFixture<Salas>;
  let raiz: HTMLElement;
  let salasMock: Sala[];
  let llamadasActivar: [string, boolean][];
  let errorSimulado: string | null;

  beforeEach(async () => {
    llamadasActivar = [];
    errorSimulado = null;
    salasMock = [
      {
        id: 's1',
        numero: 1,
        nombre: 'Sala 1',
        activa: true,
        creado_en: '2026-09-19T00:00:00Z',
        actualizado_en: '2026-09-19T00:00:00Z',
      },
      {
        id: 's2',
        numero: 2,
        nombre: 'Sala 2',
        activa: true,
        creado_en: '2026-09-19T00:00:00Z',
        actualizado_en: '2026-09-19T00:00:00Z',
      },
      {
        id: 's3',
        numero: 3,
        nombre: 'Sala 3',
        activa: false,
        creado_en: '2026-09-19T00:00:00Z',
        actualizado_en: '2026-09-19T00:00:00Z',
      },
    ];

    await TestBed.configureTestingModule({
      imports: [Salas],
      providers: [
        provideRouter([]),
        {
          provide: SalasService,
          useValue: {
            listar: () => Promise.resolve(salasMock),
            activarSala: (id: string, activa: boolean) => {
              llamadasActivar.push([id, activa]);
              if (errorSimulado) return Promise.reject(new Error(errorSimulado));
              return Promise.resolve();
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Salas);
    raiz = fixture.nativeElement;
    await fixture.whenStable();
  });

  const filas = () => Array.from(raiz.querySelectorAll('tbody tr'));
  const filaSala = (nombre: string) =>
    filas().find((tr) => tr.textContent!.includes(nombre))!;

  it('lista las salas con sus nombres, capacidad y estado', () => {
    expect(filas().length).toBe(3);
    const f1 = filaSala('Sala 1');
    expect(f1.textContent).toContain('518 butacas');
    expect(f1.textContent).toContain('Activa');
    expect(f1.querySelector('.btn-toggle')?.textContent).toContain('Desactivar');

    const f3 = filaSala('Sala 3');
    expect(f3.textContent).toContain('Inactiva');
    expect(f3.querySelector('.btn-toggle')?.textContent).toContain('Activar');
  });

  it('desactiva una sala cuando no tiene ventas futuras y actualiza la vista', async () => {
    const f1 = filaSala('Sala 1');
    const btn = f1.querySelector<HTMLButtonElement>('.btn-toggle')!;
    btn.click();
    await fixture.whenStable();

    expect(llamadasActivar).toEqual([['s1', false]]);
    expect(f1.textContent).toContain('Inactiva');
    expect(btn.textContent).toContain('Activar');
    expect(raiz.querySelector('[role=status]')?.textContent).toContain('Sala 1 desactivada');
  });

  it('bloquea la desactivación si hay funciones con entradas vendidas (AC-04.01.02)', async () => {
    errorSimulado = 'La sala tiene funciones con entradas vendidas';
    const f2 = filaSala('Sala 2');
    const btn = f2.querySelector<HTMLButtonElement>('.btn-toggle')!;
    btn.click();
    await fixture.whenStable();

    expect(llamadasActivar).toEqual([['s2', false]]);
    // Sigue activa
    expect(f2.textContent).toContain('Activa');
    expect(btn.textContent).toContain('Desactivar');
    // Muestra error
    expect(raiz.querySelector('[role=alert]')?.textContent).toContain(
      'La sala tiene funciones con entradas vendidas',
    );
  });

  it('activa una sala inactiva', async () => {
    const f3 = filaSala('Sala 3');
    const btn = f3.querySelector<HTMLButtonElement>('.btn-toggle')!;
    btn.click();
    await fixture.whenStable();

    expect(llamadasActivar).toEqual([['s3', true]]);
    expect(f3.textContent).toContain('Activa');
    expect(btn.textContent).toContain('Desactivar');
    expect(raiz.querySelector('[role=status]')?.textContent).toContain(
      'Sala 3 activada. Ahora puede recibir funciones.',
    );
  });
});

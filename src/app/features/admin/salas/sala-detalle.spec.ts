import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { SalaDetalle } from './sala-detalle';
import { SalasService } from '../../../core/data/salas-service';
import { MapaButacasComponent } from '../../../shared/ui/mapa-butacas/mapa-butacas';
import type { Sala } from '../../../core/models/sala';

describe('SalaDetalle (US-04.02, AC-04.02.06)', () => {
  let fixture: ComponentFixture<SalaDetalle>;
  let component: SalaDetalle;
  let salasServiceMock: {
    buscar: ReturnType<typeof vi.fn>;
  };

  const salaEjemplo: Sala = {
    id: 'sala-1',
    numero: 1,
    nombre: 'Sala 1',
    activa: true,
    creado_en: '2026-09-24T12:00:00Z',
    actualizado_en: '2026-09-24T12:00:00Z',
  };

  beforeEach(async () => {
    salasServiceMock = {
      buscar: vi.fn().mockResolvedValue(salaEjemplo),
    };

    await TestBed.configureTestingModule({
      imports: [SalaDetalle],
      providers: [
        provideRouter([]),
        { provide: SalasService, useValue: salasServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'sala-1' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SalaDetalle);
    component = fixture.componentInstance;
  });

  it('carga los datos de la sala y los muestra en el encabezado', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(salasServiceMock.buscar).toHaveBeenCalledWith('sala-1');
    expect(component.sala()).toEqual(salaEjemplo);

    const titulo = fixture.debugElement.query(By.css('h2'));
    expect(titulo.nativeElement.textContent).toContain('Sala 1');

    const badge = fixture.debugElement.query(By.css('.badge-estado'));
    expect(badge.nativeElement.textContent).toContain('Activa');

    const desc = fixture.debugElement.query(By.css('.capacidad-descripcion'));
    expect(desc.nativeElement.textContent).toContain('518 butacas (420 comunes · 84 VIP · 14 accesibles)');
  });

  it('renderiza el mapa de butacas en modo="ver" (AC-04.02.06)', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const mapaDebug = fixture.debugElement.query(By.directive(MapaButacasComponent));
    expect(mapaDebug).not.toBeNull();

    const mapaComp = mapaDebug.componentInstance as MapaButacasComponent;
    expect(mapaComp.modo()).toBe('ver');

    // En modo 'ver', no hay panel de selección ni botón Continuar
    const panelSeleccion = fixture.debugElement.query(By.css('#panel-seleccion'));
    expect(panelSeleccion).toBeNull();

    const btnContinuar = fixture.debugElement.query(By.css('#btn-continuar'));
    expect(btnContinuar).toBeNull();
  });

  it('muestra mensaje de error si la sala no existe', async () => {
    salasServiceMock.buscar.mockResolvedValue(null);

    const fixtureInexistente = TestBed.createComponent(SalaDetalle);
    await fixtureInexistente.whenStable();
    fixtureInexistente.detectChanges();

    const errorEl = fixtureInexistente.debugElement.query(By.css('.error'));
    expect(errorEl).not.toBeNull();
    expect(errorEl.nativeElement.textContent).toContain('No se encontró la sala');
  });
});

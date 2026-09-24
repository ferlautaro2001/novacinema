import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Funciones } from './funciones';
import { ProgramacionService } from '../../../core/data/programacion-service';
import { SalasService } from '../../../core/data/salas-service';
import { PeliculasService } from '../../../core/data/peliculas-service';
import type { Funcion } from '../../../core/models/funcion';
import type { Sala } from '../../../core/models/sala';
import type { PeliculaConCatalogo } from '../../../core/models/pelicula';

describe('Funciones (US-04.06)', () => {
  let fixture: ComponentFixture<Funciones>;
  let component: Funciones;
  let raiz: HTMLElement;

  const salasMock: Sala[] = [
    {
      id: 'sala-1',
      numero: 1,
      nombre: 'Sala 1',
      activa: true,
      creado_en: '2026-09-01T00:00:00Z',
      actualizado_en: '2026-09-01T00:00:00Z',
    },
    {
      id: 'sala-2',
      numero: 2,
      nombre: 'Sala 2',
      activa: true,
      creado_en: '2026-09-01T00:00:00Z',
      actualizado_en: '2026-09-01T00:00:00Z',
    },
  ];

  const peliculasMock: PeliculaConCatalogo[] = [
    {
      id: 'peli-1',
      titulo: 'Dune: Parte Tres',
      sinopsis: 'Paul Atreides lidera a los Fremen...',
      duracion_min: 165,
      clasificacion_id: 2,
      imagen_path: 'peliculas/dune.jpg',
      fecha_estreno: '2026-10-01',
      estado: 'en_cartelera',
      activo: true,
      destacada: false,
      creado_en: '2026-09-01T00:00:00Z',
      actualizado_en: '2026-09-01T00:00:00Z',
      clasificacion: { codigo: '+13', edad_minima: 13 },
      pelicula_generos: [{ genero: { id: 1, nombre: 'Ciencia ficción' } }],
    },
  ];

  const formatosMock = [{ id: 1, codigo: '3D', nombre: 'Tres dimensiones' }];
  const idiomasMock = [{ id: 1, codigo: 'sub', nombre: 'Subtitulada' }];

  const funcionesMock: Funcion[] = [
    {
      id: 'f-1',
      pelicula_id: 'peli-1',
      sala_id: 'sala-1',
      formato_id: 1,
      version_idioma_id: 1,
      duracion_min: 165,
      comienza_en: '2026-10-09T18:00:00.000Z',
      termina_en: '2026-10-09T20:45:00.000Z',
      libre_desde: '2026-10-09T21:15:00.000Z',
      estado: 'programada',
      creada_en: '2026-09-24T12:00:00Z',
      actualizado_en: '2026-09-24T12:00:00Z',
    },
    {
      id: 'f-2',
      pelicula_id: 'peli-1',
      sala_id: 'sala-1',
      formato_id: 1,
      version_idioma_id: 1,
      duracion_min: 165,
      comienza_en: '2026-10-09T21:30:00.000Z',
      termina_en: '2026-10-09T00:15:00.000Z',
      libre_desde: '2026-10-09T00:45:00.000Z',
      estado: 'programada',
      creada_en: '2026-09-24T12:00:00Z',
      actualizado_en: '2026-09-24T12:00:00Z',
    },
    {
      id: 'f-3',
      pelicula_id: 'peli-1',
      sala_id: 'sala-2',
      formato_id: 1,
      version_idioma_id: 1,
      duracion_min: 165,
      comienza_en: '2026-10-09T19:00:00.000Z',
      termina_en: '2026-10-09T21:45:00.000Z',
      libre_desde: '2026-10-09T22:15:00.000Z',
      estado: 'programada',
      creada_en: '2026-09-24T12:00:00Z',
      actualizado_en: '2026-09-24T12:00:00Z',
    },
  ];

  let consultarFuncionesDelDiaMock: ReturnType<typeof vi.fn>;
  let contarEntradasVendidasMock: ReturnType<typeof vi.fn>;
  let eliminarFuncionMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value() {
        this.open = false;
      },
    });

    consultarFuncionesDelDiaMock = vi.fn().mockResolvedValue(funcionesMock);
    contarEntradasVendidasMock = vi.fn().mockResolvedValue(0);
    eliminarFuncionMock = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [Funciones],
      providers: [
        provideRouter([]),
        {
          provide: SalasService,
          useValue: {
            listar: vi.fn().mockResolvedValue(salasMock),
          },
        },
        {
          provide: PeliculasService,
          useValue: {
            listar: vi.fn().mockResolvedValue(peliculasMock),
          },
        },
        {
          provide: ProgramacionService,
          useValue: {
            obtenerFormatos: vi.fn().mockResolvedValue(formatosMock),
            obtenerVersionesIdioma: vi.fn().mockResolvedValue(idiomasMock),
            consultarFuncionesDelDia: consultarFuncionesDelDiaMock,
            contarEntradasVendidas: contarEntradasVendidasMock,
            eliminarFuncion: eliminarFuncionMock,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Funciones);
    component = fixture.componentInstance;
    raiz = fixture.nativeElement;
  });

  it('muestra las funciones del día agrupadas por sala y ordenadas por horario (AC-04.06.01)', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const estado = component.estado();
    expect(estado.tipo).toBe('datos');
    if (estado.tipo === 'datos') {
      expect(estado.datos.length).toBe(2);
      expect(estado.datos[0].sala.nombre).toBe('Sala 1');
      expect(estado.datos[0].funciones.length).toBe(2);
      expect(estado.datos[1].sala.nombre).toBe('Sala 2');
      expect(estado.datos[1].funciones.length).toBe(1);

      const f1 = estado.datos[0].funciones[0];
      expect(f1.textoResumen).toContain('Dune: Parte Tres');
      expect(f1.textoResumen).toContain('3D');
      expect(f1.textoResumen).toContain('Subtitulada');
    }

    expect(raiz.textContent).toContain('Sala 1');
    expect(raiz.textContent).toContain('Sala 2');
    expect(raiz.textContent).toContain('Dune: Parte Tres');
  });

  it('muestra estado vacío cuando no hay funciones para la fecha', async () => {
    consultarFuncionesDelDiaMock.mockResolvedValue([]);

    await component.cargarFunciones('2026-10-15');
    fixture.detectChanges();

    expect(component.estado().tipo).toBe('datos');
    expect(raiz.textContent).toContain('No hay funciones programadas para este día.');
  });

  it('elimina una función sin ventas tras confirmación (AC-04.06.02)', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const estado = component.estado();
    if (estado.tipo !== 'datos') return;
    const funcionAEliminar = estado.datos[0].funciones[0];

    // Intentar eliminar abre modal
    await component.intentarEliminar(funcionAEliminar);
    fixture.detectChanges();

    expect(component.confirmacion()).toEqual(funcionAEliminar);
    expect(raiz.textContent).toContain('¿Querés eliminar la función');

    // Confirmar eliminación
    consultarFuncionesDelDiaMock.mockResolvedValue(funcionesMock.slice(1));
    await component.confirmarEliminacion(funcionAEliminar);
    fixture.detectChanges();

    expect(eliminarFuncionMock).toHaveBeenCalledWith(funcionAEliminar.id);
    expect(component.aviso()).toContain('Función eliminada correctamente.');
  });

  it('impide eliminar una función con entradas vendidas (AC-04.06.02)', async () => {
    contarEntradasVendidasMock.mockResolvedValue(12);

    await fixture.whenStable();
    fixture.detectChanges();

    const estado = component.estado();
    if (estado.tipo !== 'datos') return;
    const funcionConVentas = estado.datos[0].funciones[0];

    await component.intentarEliminar(funcionConVentas);
    fixture.detectChanges();

    expect(component.error()).toBe('No se puede eliminar una función con entradas vendidas');
    expect(component.confirmacion()).toBeNull();
    expect(eliminarFuncionMock).not.toHaveBeenCalled();
    expect(raiz.textContent).toContain('No se puede eliminar una función con entradas vendidas');
  });

  it('abre confirmación de cancelación mostrando compras registradas y anónimas con códigos (AC-04.07.02)', async () => {
    const programacionService = TestBed.inject(ProgramacionService);
    const obtenerDetalleSpy = spyOnDetalle(programacionService, {
      funcionId: 'f-1',
      totalEntradas: 12,
      comprasRegistradas: 9,
      comprasAnonimas: [
        { codigo: 'ANON-111', cantidadEntradas: 2 },
        { codigo: 'ANON-222', cantidadEntradas: 1 },
      ],
      usuarioIds: ['u1', 'u2'],
    });

    await fixture.whenStable();
    fixture.detectChanges();

    const estado = component.estado();
    if (estado.tipo !== 'datos') return;
    const funcionACancelar = estado.datos[0].funciones[0];

    await component.iniciarCancelacion(funcionACancelar);
    fixture.detectChanges();

    expect(obtenerDetalleSpy).toHaveBeenCalledWith(funcionACancelar.id);
    expect(component.confirmacionCancelar()).not.toBeNull();
    expect(raiz.textContent).toContain('Cancelar función');
    expect(raiz.textContent).toContain('9 compras con crédito automático');
    expect(raiz.textContent).toContain('2 compras anónimas a resolver en boletería');
    expect(raiz.textContent).toContain('ANON-111');
    expect(raiz.textContent).toContain('ANON-222');
  });

  it('cancela la función y libera la sala al confirmar (AC-04.07.01, AC-04.07.03)', async () => {
    const programacionService = TestBed.inject(ProgramacionService);
    spyOnDetalle(programacionService, {
      funcionId: 'f-1',
      totalEntradas: 5,
      comprasRegistradas: 5,
      comprasAnonimas: [],
      usuarioIds: ['u1'],
    });

    const cancelarSpy = vi.fn().mockResolvedValue(undefined);
    programacionService.cancelarFuncion = cancelarSpy;

    await fixture.whenStable();
    fixture.detectChanges();

    const estado = component.estado();
    if (estado.tipo !== 'datos') return;
    const funcionACancelar = estado.datos[0].funciones[0];

    await component.iniciarCancelacion(funcionACancelar);
    fixture.detectChanges();

    // Confirmar cancelación
    consultarFuncionesDelDiaMock.mockResolvedValue(funcionesMock.slice(1));
    await component.confirmarCancelacion(funcionACancelar);
    fixture.detectChanges();

    expect(cancelarSpy).toHaveBeenCalledWith(
      funcionACancelar.id,
      funcionACancelar.peliculaTitulo,
      funcionACancelar.comienzaEn
    );
    expect(component.confirmacionCancelar()).toBeNull();
    expect(component.aviso()).toContain('Función cancelada correctamente.');
  });
});

function spyOnDetalle(
  service: ProgramacionService,
  detalle: any
): ReturnType<typeof vi.fn> {
  const spy = vi.fn().mockResolvedValue(detalle);
  service.obtenerDetalleCancelacion = spy;
  return spy;
}

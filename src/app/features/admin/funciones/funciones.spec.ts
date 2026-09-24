import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Funciones } from './funciones';
import { ProgramacionService } from '../../../core/data/programacion-service';
import { SalasService } from '../../../core/data/salas-service';
import { PeliculasService } from '../../../core/data/peliculas-service';
import type { Funcion } from '../../../core/models/funcion';
import type { Sala } from '../../../core/models/sala';
import type { PeliculaConCatalogo } from '../../../core/models/pelicula';

describe('Funciones (US-04.03)', () => {
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
  ];

  const peliculasMock: PeliculaConCatalogo[] = [
    {
      id: 'peli-1',
      titulo: 'Inception',
      sinopsis: 'Un ladrón que roba secretos corporativos...',
      duracion_min: 148,
      clasificacion_id: 2,
      imagen_path: 'peliculas/inception.jpg',
      fecha_estreno: '2010-07-16',
      estado: 'en_cartelera',
      activo: true,
      destacada: false,
      creado_en: '2026-09-01T00:00:00Z',
      actualizado_en: '2026-09-01T00:00:00Z',
      clasificacion: { codigo: '+13', edad_minima: 13 },
      pelicula_generos: [{ genero: { id: 1, nombre: 'Ciencia ficción' } }],
    },
  ];

  const formatosMock = [{ id: 1, codigo: '2D', nombre: 'Tradicional 2D' }];
  const idiomasMock = [{ id: 1, codigo: 'CAS', nombre: 'Castellano' }];

  const funcionesMock: Funcion[] = [
    {
      id: 'f-1',
      pelicula_id: 'peli-1',
      sala_id: 'sala-1',
      formato_id: 1,
      version_idioma_id: 1,
      duracion_min: 148,
      comienza_en: '2026-09-25T18:00:00Z',
      termina_en: '2026-09-25T20:28:00Z',
      libre_desde: '2026-09-25T20:58:00Z',
      estado: 'programada',
      creada_en: '2026-09-24T12:00:00Z',
      actualizado_en: '2026-09-24T12:00:00Z',
    },
  ];

  let consultarFuncionesDelDiaMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    consultarFuncionesDelDiaMock = vi.fn().mockResolvedValue(funcionesMock);

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
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Funciones);
    component = fixture.componentInstance;
    raiz = fixture.nativeElement;
  });

  it('debe inicializarse y cargar las funciones del día', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.funciones().length).toBe(1);
    expect(component.funciones()[0].peliculaTitulo).toBe('Inception');
    expect(component.funciones()[0].salaNombre).toBe('Sala 1');
    expect(raiz.textContent).toContain('Inception');
    expect(raiz.textContent).toContain('Sala 1');
  });

  it('muestra estado vacío si no hay funciones para la fecha', async () => {
    consultarFuncionesDelDiaMock.mockResolvedValue([]);

    await component.cargarFunciones('2026-09-30');
    fixture.detectChanges();

    expect(component.funciones().length).toBe(0);
    expect(raiz.textContent).toContain('No hay funciones programadas');
  });

  it('cambia de fecha correctamente', async () => {
    consultarFuncionesDelDiaMock.mockResolvedValue([]);

    await component.onFechaElegida(new Date(2026, 8, 28)); // 28 de septiembre
    fixture.detectChanges();

    expect(component.fechaSeleccionada()).toBe('2026-09-28');
    expect(consultarFuncionesDelDiaMock).toHaveBeenCalledWith('2026-09-28');
  });
});

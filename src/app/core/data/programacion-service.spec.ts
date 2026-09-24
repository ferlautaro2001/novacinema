import { TestBed } from '@angular/core/testing';
import { ProgramacionService } from './programacion-service';
import { SalasService } from './salas-service';
import { Supabase } from '../supabase/supabase-client';
import type { Sala } from '../models/sala';

describe('ProgramacionService (US-04.03)', () => {
  let service: ProgramacionService;
  let salasServiceMock: { listar: ReturnType<typeof vi.fn> };
  let supabaseMock: any;

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

  beforeEach(() => {
    salasServiceMock = {
      listar: vi.fn().mockResolvedValue(salasMock),
    };

    supabaseMock = {
      Sup: {
        from: vi.fn((tabla: string) => {
          if (tabla === 'configuracion') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: { valor: '30' }, error: null }),
            };
          }
          if (tabla === 'funciones') {
            return {
              select: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lte: vi.fn().mockReturnThis(),
              neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          if (tabla === 'formatos') {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 1, codigo: '2D', nombre: '2D' },
                  { id: 2, codigo: '3D', nombre: '3D' },
                ],
                error: null,
              }),
            };
          }
          if (tabla === 'versiones_idioma') {
            return {
              select: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 1, codigo: 'castellano', nombre: 'Castellano' },
                  { id: 2, codigo: 'subtitulada', nombre: 'Subtitulada' },
                ],
                error: null,
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
          };
        }),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        ProgramacionService,
        { provide: SalasService, useValue: salasServiceMock },
        { provide: Supabase, useValue: supabaseMock },
      ],
    });

    service = TestBed.inject(ProgramacionService);
  });

  it('obtiene salas activas ordenadas por número', async () => {
    const salas = await service.obtenerSalasActivas();
    expect(salas.length).toBe(2);
    expect(salas[0].numero).toBe(1);
    expect(salas[1].numero).toBe(2);
  });

  it('calcula la programación y asigna salas automáticamente (AC-04.03.01, AC-04.03.02)', async () => {
    const res = await service.calcularProgramacion({
      peliculaId: 'peli-1',
      duracionMin: 120,
      fechaInicio: '2026-10-05',
      semanas: 1,
      diasSemana: [1, 2, 5],
      horarios: ['18:00'],
      formatoId: 1,
      versionIdiomaId: 1,
    });

    expect(res.length).toBe(3);
    expect(res.every((item) => item.asignada)).toBe(true);
    expect(res.every((item) => item.sala?.id === 'sala-1')).toBe(true);
  });

  it('crea las funciones asignadas en la base de datos', async () => {
    const resumen = await service.calcularProgramacion({
      peliculaId: 'peli-1',
      duracionMin: 120,
      fechaInicio: '2026-10-05',
      semanas: 1,
      diasSemana: [1],
      horarios: ['18:00'],
      formatoId: 1,
      versionIdiomaId: 1,
    });

    const resultado = await service.crearFunciones(
      resumen,
      'peli-1',
      120,
      1,
      1
    );

    expect(resultado.creadas).toBe(1);
    expect(resultado.fallidas).toBe(0);
  });
});

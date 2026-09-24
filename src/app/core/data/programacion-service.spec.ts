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

  it('cuenta las entradas vendidas de una función', async () => {
    supabaseMock.Sup.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ count: 5, error: null }),
    });

    const total = await service.contarEntradasVendidas('func-1');
    expect(total).toBe(5);
  });

  it('elimina una función sin ventas (AC-04.06.02)', async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    supabaseMock.Sup.from = vi.fn((tabla: string) => {
      if (tabla === 'entradas') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }
      if (tabla === 'funciones') {
        return {
          delete: deleteMock,
        };
      }
      return {};
    });

    await service.eliminarFuncion('func-sin-ventas');
    expect(deleteMock).toHaveBeenCalled();
  });

  it('falla al eliminar una función con entradas vendidas (AC-04.06.02)', async () => {
    supabaseMock.Sup.from = vi.fn((tabla: string) => {
      if (tabla === 'entradas') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ count: 12, error: null }),
        };
      }
      return {};
    });

    await expect(service.eliminarFuncion('func-con-ventas')).rejects.toThrow(
      'No se puede eliminar una función con entradas vendidas'
    );
  });

  it('obtiene el detalle de cancelación separando compras registradas y anónimas (AC-04.07.02)', async () => {
    // 9 entradas de usuarios registrados y 3 de compras anónimas
    const entradasMock = [
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `e-reg-${i}`,
        compra_id: `c-reg-${i}`,
        compras: { id: `c-reg-${i}`, codigo: `REG${i}`, usuario_id: `user-${i}` },
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `e-anon-${i}`,
        compra_id: `c-anon-${i}`,
        compras: { id: `c-anon-${i}`, codigo: `ANON${i}`, usuario_id: null },
      })),
    ];

    supabaseMock.Sup.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({ data: entradasMock, error: null }),
    });

    const detalle = await service.obtenerDetalleCancelacion('func-1');

    expect(detalle.totalEntradas).toBe(12);
    expect(detalle.comprasRegistradas).toBe(9);
    expect(detalle.comprasAnonimas.length).toBe(3);
    expect(detalle.comprasAnonimas[0].codigo).toBe('ANON0');
    expect(detalle.usuarioIds.length).toBe(9);
  });

  it('cancela la función actualizando su estado a cancelada (AC-04.07.01, AC-04.07.03)', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const insertNotifMock = vi.fn().mockResolvedValue({ data: null, error: null });

    supabaseMock.Sup.from = vi.fn((tabla: string) => {
      if (tabla === 'entradas') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'e1',
                compra_id: 'c1',
                compras: { id: 'c1', codigo: 'REG01', usuario_id: 'u1' },
              },
            ],
            error: null,
          }),
        };
      }
      if (tabla === 'funciones') {
        return {
          update: updateMock,
        };
      }
      if (tabla === 'notificaciones') {
        return {
          insert: insertNotifMock,
        };
      }
      return {};
    });

    await service.cancelarFuncion('func-1', 'Dune', '18:00');

    expect(updateMock).toHaveBeenCalledWith({ estado: 'cancelada' });
    expect(insertNotifMock).toHaveBeenCalled();
  });
});

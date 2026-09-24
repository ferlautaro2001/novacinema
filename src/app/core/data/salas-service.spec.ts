import { TestBed } from '@angular/core/testing';
import { SalasService } from './salas-service';
import { Supabase } from '../supabase/supabase-client';

describe('SalasService (US-04.01)', () => {
  let servicio: SalasService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      Sup: {
        from: vi.fn(),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        SalasService,
        { provide: Supabase, useValue: mockSupabase },
      ],
    });

    servicio = TestBed.inject(SalasService);
  });

  it('lista las salas ordenadas por número', async () => {
    const salas = [
      { id: 's1', numero: 1, nombre: 'Sala 1', activa: true },
      { id: 's2', numero: 2, nombre: 'Sala 2', activa: false },
    ];

    mockSupabase.Sup.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: salas, error: null }),
      }),
    });

    const res = await servicio.listar();
    expect(res).toEqual(salas);
  });

  it('detecta si hay ventas futuras activas en una sala', async () => {
    // Caso 1: tiene funciones futuras con entradas vendidas
    mockSupabase.Sup.from.mockImplementation((tabla: string) => {
      if (tabla === 'funciones') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ data: [{ id: 'f1' }], error: null }),
              }),
            }),
          }),
        };
      }
      if (tabla === 'entradas') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ count: 5, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const tieneVentas = await servicio.tieneVentasFuturas('s1');
    expect(tieneVentas).toBe(true);
  });

  it('bloquea la desactivación si hay funciones con entradas vendidas (AC-04.01.02)', async () => {
    vi.spyOn(servicio, 'tieneVentasFuturas').mockResolvedValue(true);

    await expect(servicio.activarSala('s2', false)).rejects.toThrow(
      'La sala tiene funciones con entradas vendidas',
    );
  });

  it('permite desactivar una sala si no tiene ventas futuras', async () => {
    vi.spyOn(servicio, 'tieneVentasFuturas').mockResolvedValue(false);

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockSupabase.Sup.from.mockReturnValue({ update: updateMock });

    await servicio.activarSala('s2', false);
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ activa: false }));
  });

  it('permite activar una sala sin chequeo de ventas', async () => {
    const tieneVentasSpy = vi.spyOn(servicio, 'tieneVentasFuturas');

    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockSupabase.Sup.from.mockReturnValue({ update: updateMock });

    await servicio.activarSala('s2', true);
    expect(tieneVentasSpy).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ activa: true }));
  });
});

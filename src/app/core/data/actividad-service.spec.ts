import { TestBed } from '@angular/core/testing';
import { Supabase } from '../supabase/supabase-client';
import { ActividadService } from './actividad-service';

// Cliente de Supabase de mentira: cada tabla devuelve sus filas y se anota qué se
// consultó, para comprobar que el servicio solo pide lo que necesita.
function supabaseFalso(tablas: Record<string, unknown[]>) {
  const consultadas: string[] = [];
  const ordenes: { columna: string; ascending: boolean }[] = [];
  const consulta = (tabla: string) => {
    const resultado = Promise.resolve({ data: tablas[tabla] ?? [], error: null });
    const builder = {
      select: () => builder,
      in: () => builder,
      order: (columna: string, opciones: { ascending: boolean }) => {
        ordenes.push({ columna, ascending: opciones.ascending });
        return builder;
      },
      then: resultado.then.bind(resultado),
    };
    return builder;
  };
  const cliente = {
    Sup: {
      from: (tabla: string) => {
        consultadas.push(tabla);
        return consulta(tabla);
      },
    },
  };
  return { cliente, consultadas, ordenes };
}

describe('ActividadService (US-01.06)', () => {
  const laura = { nombre: 'Laura', apellido: 'Gómez' };

  function crear(tablas: Record<string, unknown[]>) {
    const falso = supabaseFalso(tablas);
    TestBed.configureTestingModule({ providers: [{ provide: Supabase, useValue: falso.cliente }] });
    return { servicio: TestBed.inject(ActividadService), ...falso };
  }

  it('devuelve cada registro con autor, acción, detalle y fecha y hora (AC-01.06.01)', async () => {
    const { servicio, ordenes } = crear({
      actividad: [
        {
          id: 'a1',
          creado_en: '2026-10-05T13:15:32Z',
          entidad: 'funciones',
          detalle: {
            antes: null,
            despues: { pelicula_id: 'p1', sala_id: 's2', comienza_en: '2026-10-09T21:00:00Z' },
          },
          accion: { codigo: 'funcion_creada' },
          autor: laura,
        },
      ],
      peliculas: [{ id: 'p1', titulo: 'Dune' }],
      salas: [{ id: 's2', nombre: 'Sala 2' }],
    });

    const [registro] = await servicio.findAll();

    expect(registro).toEqual({
      id: 'a1',
      fecha: new Date('2026-10-05T13:15:32Z'),
      autor: 'Laura Gómez',
      codigo: 'funcion_creada',
      accion: 'Creó función',
      entidad: 'funciones',
      detalle: 'Dune · Sala 2 · 09/10/2026 18:00',
    });
    expect(ordenes).toContainEqual({ columna: 'creado_en', ascending: false });
  });

  it('solo consulta las tablas de nombres que hacen falta', async () => {
    const { servicio, consultadas } = crear({
      actividad: [
        {
          id: 'a2',
          creado_en: '2026-10-22T23:40:12Z',
          entidad: 'entradas',
          detalle: { antes: { compra_id: 'c1' }, despues: { compra_id: 'c1' } },
          accion: { codigo: 'qr_validado' },
          autor: { nombre: 'Pablo', apellido: 'Ruiz' },
        },
      ],
      compras: [{ id: 'c1', codigo: 'NOVA-7K3P9Q' }],
    });

    const [registro] = await servicio.findAll();

    expect(registro.accion).toBe('Validó QR');
    expect(registro.detalle).toBe('NOVA-7K3P9Q');
    expect(consultadas).toEqual(['actividad', 'compras']);
  });

  it('no expone ninguna forma de modificar ni borrar registros (AC-01.06.02)', () => {
    const { servicio } = crear({ actividad: [] });
    const metodos = Object.getOwnPropertyNames(Object.getPrototypeOf(servicio));
    expect(
      metodos.filter((m) => /crear|insert|update|modificar|delete|borrar|eliminar/i.test(m)),
    ).toEqual([]);
  });

  it('propaga el error de Supabase', async () => {
    const error = new Error('sin permiso');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Supabase,
          useValue: {
            Sup: {
              from: () => ({
                select: () => ({ order: () => Promise.resolve({ data: null, error }) }),
              }),
            },
          },
        },
      ],
    });
    await expect(TestBed.inject(ActividadService).findAll()).rejects.toBe(error);
  });
});

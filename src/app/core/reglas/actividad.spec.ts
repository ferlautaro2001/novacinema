import {
  detalleActividad,
  etiquetaAccion,
  fechaHora,
  filaAuditada,
  NombresActividad,
  nombresVacios,
} from './actividad';
import type { Json } from '../supabase/database.types';

describe('actividad (US-01.06)', () => {
  const nombres: NombresActividad = {
    ...nombresVacios(),
    peliculas: new Map([['p1', 'Dune']]),
    salas: new Map([['s2', 'Sala 2']]),
    compras: new Map([['c1', 'NOVA-7K3P9Q']]),
    productos: new Map([['pr1', 'Balde de pochoclos']]),
    tiposButaca: new Map([[1, 'Común']]),
    formatos: new Map([[2, '3D']]),
    roles: new Map([
      [1, 'Cliente'],
      [2, 'Empleado'],
    ]),
  };

  it('nombra cada acción como la lee el administrador', () => {
    expect(etiquetaAccion('funcion_creada')).toBe('Creó función');
    expect(etiquetaAccion('qr_validado')).toBe('Validó QR');
    expect(etiquetaAccion('candy_entregado')).toBe('Entregó Candy');
  });

  it('describe una función creada con película, sala y horario (AC-01.06.01)', () => {
    const detalle = {
      antes: null,
      despues: { pelicula_id: 'p1', sala_id: 's2', comienza_en: '2026-10-09T21:00:00+00:00' },
    };
    expect(detalleActividad('funciones', detalle, nombres)).toBe(
      'Dune · Sala 2 · 09/10/2026 18:00',
    );
  });

  it('muestra la fecha en hora de Argentina', () => {
    expect(fechaHora('2026-10-05T13:15:32Z')).toBe('05/10/2026 10:15');
  });

  it('describe los cambios de precio de cada tipo', () => {
    const d = (despues: { [clave: string]: Json }): Json => ({ antes: null, despues });
    expect(
      detalleActividad('precios_butaca', d({ tipo_butaca_id: 1, precio: 8000 }), nombres),
    ).toBe('Común · $ 8.000');
    expect(
      detalleActividad('adicionales_formato', d({ formato_id: 2, adicional: 1500.5 }), nombres),
    ).toBe('Adicional 3D · $ 1.500,5');
    expect(
      detalleActividad('precios_producto', d({ producto_id: 'pr1', precio: 5000 }), nombres),
    ).toBe('Balde de pochoclos · $ 5.000');
    expect(
      detalleActividad(
        'preventas',
        d({ pelicula_id: 'p1', porcentaje: 25, habilitada: false }),
        nombres,
      ),
    ).toBe('Preventa Dune · 25 % · deshabilitada');
    expect(
      detalleActividad(
        'cupones',
        d({ codigo: 'BIENVENIDA', porcentaje: 10, activo: true }),
        nombres,
      ),
    ).toBe('Cupón BIENVENIDA · 10 %');
    expect(
      detalleActividad('recompensas', d({ nombre: 'Combo pareja', costo_puntos: 30000 }), nombres),
    ).toBe('Combo pareja · 30.000 Nova Points');
  });

  it('identifica validaciones y entregas por el código de la compra', () => {
    const detalle = { antes: { compra_id: 'c1' }, despues: { compra_id: 'c1' } };
    expect(detalleActividad('entradas', detalle, nombres)).toBe('NOVA-7K3P9Q');
    expect(detalleActividad('pedidos_candy', detalle, nombres)).toBe('NOVA-7K3P9Q');
  });

  it('muestra el cambio de rol', () => {
    const detalle = {
      antes: { nombre: 'Luis', apellido: 'Ferreyra', rol_id: 1 },
      despues: { nombre: 'Luis', apellido: 'Ferreyra', rol_id: 2 },
    };
    expect(detalleActividad('usuarios', detalle, nombres)).toBe(
      'Luis Ferreyra · Cliente → Empleado',
    );
  });

  it('no se rompe si falta un nombre o el detalle viene vacío', () => {
    const detalle = { antes: null, despues: { pelicula_id: 'otra', sala_id: 's2' } };
    expect(detalleActividad('funciones', detalle, nombres)).toBe('Sala 2');
    expect(detalleActividad('entidad_nueva', detalle, nombres)).toBe('');
    expect(filaAuditada(null)).toEqual({});
  });
});

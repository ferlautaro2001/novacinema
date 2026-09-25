import { inject, Service } from '@angular/core';
import type { Json } from '../supabase/database.types';
import type { AccionAuditoriaCodigo } from '../models/enumerados';
import type { RegistroActividad } from '../models/actividad';
import {
  detalleActividad,
  etiquetaAccion,
  filaAuditada,
  NombresActividad,
  nombresVacios,
} from '../reglas/actividad';
import { Supabase } from '../supabase/supabase-client';

// Solo lectura a propósito: el log lo escribe la base con triggers y nadie
// puede modificarlo ni borrarlo (AC-01.06.02). Por eso acá no hay alta, edición
// ni baja.
@Service()
export class ActividadService {
  private supS = inject(Supabase);

  // Del más reciente al más antiguo, con autor, acción y detalle legibles.
  async findAll(): Promise<RegistroActividad[]> {
    const { data, error } = await this.supS.Sup.from('actividad')
      .select(
        'id, creado_en, entidad, detalle, accion:acciones_auditoria(codigo), autor:usuarios!actividad_usuario_id_fkey(nombre, apellido)',
      )
      .order('creado_en', { ascending: false });
    if (error) throw error;

    const nombres = await this.cargarNombres(data);
    return data.map((fila) => {
      const codigo = fila.accion?.codigo as AccionAuditoriaCodigo;
      return {
        id: fila.id,
        fecha: new Date(fila.creado_en),
        autor: fila.autor ? `${fila.autor.nombre} ${fila.autor.apellido}`.trim() : '',
        codigo,
        accion: etiquetaAccion(codigo),
        entidad: fila.entidad,
        detalle: detalleActividad(fila.entidad, fila.detalle, nombres),
      };
    });
  }

  // El trigger guarda ids; busco de una sola vez los nombres que hacen falta,
  // una consulta por tabla y solo si hay algo que buscar.
  private async cargarNombres(
    filas: { entidad: string; detalle: RegistroDetalle }[],
  ): Promise<NombresActividad> {
    const ids = {
      peliculas: new Set<string>(),
      salas: new Set<string>(),
      compras: new Set<string>(),
      productos: new Set<string>(),
    };
    let tiposButaca = false;
    let formatos = false;
    let roles = false;

    for (const { entidad, detalle } of filas) {
      const f = filaAuditada(detalle);
      const agregar = (conjunto: Set<string>, valor: unknown) => {
        if (typeof valor === 'string') conjunto.add(valor);
      };
      if (entidad === 'funciones') {
        agregar(ids.peliculas, f['pelicula_id']);
        agregar(ids.salas, f['sala_id']);
      }
      if (entidad === 'preventas') agregar(ids.peliculas, f['pelicula_id']);
      if (entidad === 'entradas' || entidad === 'pedidos_candy')
        agregar(ids.compras, f['compra_id']);
      if (entidad === 'precios_producto') agregar(ids.productos, f['producto_id']);
      if (entidad === 'precios_butaca') tiposButaca = true;
      if (entidad === 'adicionales_formato') formatos = true;
      if (entidad === 'usuarios') roles = true;
    }

    const nombres = nombresVacios();
    const sup = this.supS.Sup;
    const consultas: Promise<void>[] = [];

    if (ids.peliculas.size) {
      consultas.push(
        this.leer(
          sup
            .from('peliculas')
            .select('id, titulo')
            .in('id', [...ids.peliculas]),
          (f) => nombres.peliculas.set(f.id, f.titulo),
        ),
      );
    }
    if (ids.salas.size) {
      consultas.push(
        this.leer(
          sup
            .from('salas')
            .select('id, nombre')
            .in('id', [...ids.salas]),
          (f) => nombres.salas.set(f.id, f.nombre),
        ),
      );
    }
    if (ids.compras.size) {
      consultas.push(
        this.leer(
          sup
            .from('compras')
            .select('id, codigo')
            .in('id', [...ids.compras]),
          (f) => nombres.compras.set(f.id, f.codigo),
        ),
      );
    }
    if (ids.productos.size) {
      consultas.push(
        this.leer(
          sup
            .from('productos')
            .select('id, nombre')
            .in('id', [...ids.productos]),
          (f) => nombres.productos.set(f.id, f.nombre),
        ),
      );
    }
    if (tiposButaca) {
      consultas.push(
        this.leer(sup.from('tipos_butaca').select('id, nombre'), (f) =>
          nombres.tiposButaca.set(f.id, f.nombre),
        ),
      );
    }
    if (formatos) {
      consultas.push(
        this.leer(sup.from('formatos').select('id, codigo'), (f) =>
          nombres.formatos.set(f.id, f.codigo),
        ),
      );
    }
    if (roles) {
      consultas.push(
        this.leer(sup.from('roles').select('id, nombre'), (f) => nombres.roles.set(f.id, f.nombre)),
      );
    }

    await Promise.all(consultas);
    return nombres;
  }

  private async leer<T>(
    consulta: PromiseLike<{ data: T[] | null; error: unknown }>,
    guardar: (fila: T) => void,
  ): Promise<void> {
    const { data, error } = await consulta;
    if (error) throw error;
    data?.forEach(guardar);
  }
}

type RegistroDetalle = Json | null;

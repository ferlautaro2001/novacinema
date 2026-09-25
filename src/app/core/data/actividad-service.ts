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

// Solo lectura a propósito: el log lo escribe la base con triggers y nadie puede
// modificarlo ni borrarlo.
@Service()
export class ActividadService {
  private supS = inject(Supabase);

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

  // El trigger guarda ids: junto los que hacen falta y busco los nombres con una
  // consulta por tabla, solo si hay algo que buscar.
  private async cargarNombres(
    filas: { entidad: string; detalle: Json | null }[],
  ): Promise<NombresActividad> {
    const peliculas = new Set<string>();
    const salas = new Set<string>();
    const compras = new Set<string>();
    const productos = new Set<string>();
    let tiposButaca = false;
    let formatos = false;
    let roles = false;

    for (const { entidad, detalle } of filas) {
      const f = filaAuditada(detalle);
      if (entidad === 'funciones') {
        agregar(peliculas, f['pelicula_id']);
        agregar(salas, f['sala_id']);
      }
      if (entidad === 'preventas') agregar(peliculas, f['pelicula_id']);
      if (entidad === 'entradas' || entidad === 'pedidos_candy') agregar(compras, f['compra_id']);
      if (entidad === 'precios_producto') agregar(productos, f['producto_id']);
      if (entidad === 'precios_butaca') tiposButaca = true;
      if (entidad === 'adicionales_formato') formatos = true;
      if (entidad === 'usuarios') roles = true;
    }

    const nombres = nombresVacios();
    const sup = this.supS.Sup;

    if (peliculas.size) {
      const { data, error } = await sup
        .from('peliculas')
        .select('id, titulo')
        .in('id', [...peliculas]);
      if (error) throw error;
      for (const p of data) nombres.peliculas.set(p.id, p.titulo);
    }
    if (salas.size) {
      const { data, error } = await sup
        .from('salas')
        .select('id, nombre')
        .in('id', [...salas]);
      if (error) throw error;
      for (const s of data) nombres.salas.set(s.id, s.nombre);
    }
    if (compras.size) {
      const { data, error } = await sup
        .from('compras')
        .select('id, codigo')
        .in('id', [...compras]);
      if (error) throw error;
      for (const c of data) nombres.compras.set(c.id, c.codigo);
    }
    if (productos.size) {
      const { data, error } = await sup
        .from('productos')
        .select('id, nombre')
        .in('id', [...productos]);
      if (error) throw error;
      for (const p of data) nombres.productos.set(p.id, p.nombre);
    }
    if (tiposButaca) {
      const { data, error } = await sup.from('tipos_butaca').select('id, nombre');
      if (error) throw error;
      for (const t of data) nombres.tiposButaca.set(t.id, t.nombre);
    }
    if (formatos) {
      const { data, error } = await sup.from('formatos').select('id, codigo');
      if (error) throw error;
      for (const f of data) nombres.formatos.set(f.id, f.codigo);
    }
    if (roles) {
      const { data, error } = await sup.from('roles').select('id, nombre');
      if (error) throw error;
      for (const r of data) nombres.roles.set(r.id, r.nombre);
    }

    return nombres;
  }
}

function agregar(conjunto: Set<string>, valor: unknown) {
  if (typeof valor === 'string') conjunto.add(valor);
}

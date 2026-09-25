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
    if (error !== null) {
      throw error;
    }

    const nombres = await this.cargarNombres(data);

    const registros: RegistroActividad[] = [];

    for (const fila of data) {
      const codigo = codigoAccion(fila.accion);
      const fecha = new Date(fila.creado_en);
      const autor = nombreAutor(fila.autor);
      const accion = etiquetaAccion(codigo);
      const detalle = detalleActividad(fila.entidad, fila.detalle, nombres);

      const registro: RegistroActividad = {
        id: fila.id,
        fecha: fecha,
        autor: autor,
        codigo: codigo,
        accion: accion,
        entidad: fila.entidad,
        detalle: detalle,
      };

      registros.push(registro);
    }

    return registros;
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

    for (const registro of filas) {
      const fila = filaAuditada(registro.detalle);

      switch (registro.entidad) {
        case 'funciones':
          agregar(peliculas, fila['pelicula_id']);
          agregar(salas, fila['sala_id']);
          break;

        case 'preventas':
          agregar(peliculas, fila['pelicula_id']);
          break;

        case 'entradas':
        case 'pedidos_candy':
          agregar(compras, fila['compra_id']);
          break;

        case 'precios_producto':
          agregar(productos, fila['producto_id']);
          break;

        case 'precios_butaca':
          tiposButaca = true;
          break;

        case 'adicionales_formato':
          formatos = true;
          break;

        case 'usuarios':
          roles = true;
          break;
      }
    }

    const nombres = nombresVacios();
    const cliente = this.supS.Sup;

    if (peliculas.size !== 0) {
      const idsPeliculas = [...peliculas];
      const { data, error } = await cliente
        .from('peliculas')
        .select('id, titulo')
        .in('id', idsPeliculas);
      if (error !== null) {
        throw error;
      }

      for (const pelicula of data) {
        nombres.peliculas.set(pelicula.id, pelicula.titulo);
      }
    }

    if (salas.size !== 0) {
      const idsSalas = [...salas];
      const { data, error } = await cliente.from('salas').select('id, nombre').in('id', idsSalas);
      if (error !== null) {
        throw error;
      }

      for (const sala of data) {
        nombres.salas.set(sala.id, sala.nombre);
      }
    }

    if (compras.size !== 0) {
      const idsCompras = [...compras];
      const { data, error } = await cliente
        .from('compras')
        .select('id, codigo')
        .in('id', idsCompras);
      if (error !== null) {
        throw error;
      }

      for (const compra of data) {
        nombres.compras.set(compra.id, compra.codigo);
      }
    }

    if (productos.size !== 0) {
      const idsProductos = [...productos];
      const { data, error } = await cliente
        .from('productos')
        .select('id, nombre')
        .in('id', idsProductos);
      if (error !== null) {
        throw error;
      }

      for (const producto of data) {
        nombres.productos.set(producto.id, producto.nombre);
      }
    }

    if (tiposButaca) {
      const { data, error } = await cliente.from('tipos_butaca').select('id, nombre');
      if (error !== null) {
        throw error;
      }

      for (const tipoButaca of data) {
        nombres.tiposButaca.set(tipoButaca.id, tipoButaca.nombre);
      }
    }

    if (formatos) {
      const { data, error } = await cliente.from('formatos').select('id, codigo');
      if (error !== null) {
        throw error;
      }

      for (const formato of data) {
        nombres.formatos.set(formato.id, formato.codigo);
      }
    }

    if (roles) {
      const { data, error } = await cliente.from('roles').select('id, nombre');
      if (error !== null) {
        throw error;
      }

      for (const rol of data) {
        nombres.roles.set(rol.id, rol.nombre);
      }
    }

    return nombres;
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function codigoAccion(accion: { codigo: string } | null): AccionAuditoriaCodigo {
  let codigo: string | undefined = undefined;

  if (accion !== null && accion !== undefined) {
    codigo = accion.codigo;
  }

  const codigoTipado = codigo as AccionAuditoriaCodigo;

  return codigoTipado;
}

function nombreAutor(autor: { nombre: string; apellido: string } | null): string {
  let nombreCompleto = '';

  if (autor !== null && autor !== undefined) {
    nombreCompleto = `${autor.nombre} ${autor.apellido}`.trim();
  }

  return nombreCompleto;
}

function agregar(conjunto: Set<string>, valor: Json | undefined): void {
  if (typeof valor === 'string') {
    conjunto.add(valor);
  }
}

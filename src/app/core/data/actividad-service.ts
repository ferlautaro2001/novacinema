import { inject, Service } from '@angular/core';
import type { AccionAuditoriaCodigo } from '../models/enumerados';
import type { GrupoActividad, RegistroActividad } from '../models/actividad';
import { Supabase } from '../supabase/supabase-client';

// Lectura del registro de actividad. Solo eso.
//
// La escritura no pasa por acá: el trigger novacinema_private.registrar_actividad()
// decide qué es un evento de negocio y guarda el antes/después crudo. La función
// public.registro_actividad_legible() resuelve los ids de ese jsonb contra las
// tablas y arma la línea de texto, así que acá no hay ni una consulta por tabla.
@Service()
export class ActividadService {
  private supS = inject(Supabase);

  // Los grupos son los tres que pide AC-12.06.02, más 'otros' para los eventos
  // que el enunciado no enumera (productos, cambio de rol, cancelación de compra).
  // 'todos' es el valor por defecto: es lo que trae la función cuando no se filtra.
  //
  // El log se ordena del más reciente al más antiguo y se recorta en la base, que
  // es donde están los datos: filtrar y paginar en el navegador obligaría a
  // traer el histórico entero.
  async findAll(grupo: GrupoActividad | 'todos' = 'todos'): Promise<RegistroActividad[]> {
    // SELECT registro_actividad_legible(p_grupo)   -- la base arma la frase
    const { data, error } = await this.supS.Sup.rpc('registro_actividad_legible', {
      p_grupo: grupo,
    });
    if (error !== null) {
      throw error;
    }

    const registros: RegistroActividad[] = [];

    for (const fila of data) {
      const codigo = fila.codigo as AccionAuditoriaCodigo;
      const grupo = fila.grupo as GrupoActividad;

      const registro: RegistroActividad = {
        id: fila.id,
        fecha: new Date(fila.creado_en),
        autor: fila.autor,
        codigo: codigo,
        accion: fila.accion,
        entidad: fila.entidad,
        detalle: fila.detalle,
        grupo: grupo,
      };

      registros.push(registro);
    }

    return registros;
  }
}

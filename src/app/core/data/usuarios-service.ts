import { inject, Service } from '@angular/core';
import type { Rol } from '../models/enumerados';
import { Supabase } from '../supabase/supabase-client';

// Lo que muestra el listado de usuarios del Panel.
export interface UsuarioConRol {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
}

// La función de la base responde en impersonal; en la app se habla de vos.
const MENSAJES_RPC: Record<string, string> = {
  'Solo el administrador puede cambiar roles': 'Solo un administrador puede cambiar roles.',
  'No puede modificar su propio rol': 'No podés cambiar tu propio rol.',
  'Usuario no encontrado o rol protegido':
    'Ese usuario no existe o es administrador: su rol no se cambia desde acá.',
};

@Service()
export class UsuariosService {
  private supS = inject(Supabase);

  // RLS deja leer todos los perfiles solo al personal (US-01.07).
  async findAllConRol(): Promise<UsuarioConRol[]> {
    const { data, error } = await this.supS.Sup.from('usuarios')
      .select('id, nombre, apellido, email, rol:roles(codigo)')
      .order('apellido')
      .order('nombre');
    if (error) throw error;
    return data.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      apellido: u.apellido,
      email: u.email,
      rol: u.rol.codigo as Rol,
    }));
  }

  // Excepción justificada a "sin RPC desde Angular" (US-02.07): el cliente no
  // tiene UPDATE sobre usuarios.rol_id, y la función verifica que quien llama sea
  // administrador, que no se cambie su propio rol y que solo alterne entre
  // cliente y empleado.
  async asignarRolEmpleado(usuarioId: string, empleado: boolean): Promise<void> {
    const { error } = await this.supS.Sup.rpc('asignar_rol_empleado', {
      p_usuario_id: usuarioId,
      p_empleado: empleado,
    });
    if (error) {
      throw new Error(MENSAJES_RPC[error.message] ?? 'No se pudo cambiar el rol. Probá de nuevo.');
    }
  }
}

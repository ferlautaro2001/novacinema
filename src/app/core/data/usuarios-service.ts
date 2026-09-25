import { inject, Service } from '@angular/core';
import type { Rol } from '../models/enumerados';
import { Supabase } from '../supabase/supabase-client';

export interface UsuarioConRol {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
}

// La función de la base responde en impersonal y en la app hablamos de vos.
const MENSAJES_RPC: Record<string, string> = {
  'Solo el administrador puede cambiar roles': 'Solo un administrador puede cambiar roles.',
  'No puede modificar su propio rol': 'No podés cambiar tu propio rol.',
  'Usuario no encontrado o rol protegido':
    'Ese usuario no existe o es administrador: su rol no se cambia desde acá.',
};

@Service()
export class UsuariosService {
  private supS = inject(Supabase);

  // RLS deja leer todos los perfiles solo al personal.
  async findAllConRol(): Promise<UsuarioConRol[]> {
    const { data, error } = await this.supS.Sup.from('usuarios')
      .select('id, nombre, apellido, email, rol:roles(codigo)')
      .order('apellido')
      .order('nombre');
    if (error !== null) {
      throw error;
    }

    const usuarios: UsuarioConRol[] = [];

    for (const fila of data) {
      const rol = fila.rol.codigo as Rol;

      const usuario: UsuarioConRol = {
        id: fila.id,
        nombre: fila.nombre,
        apellido: fila.apellido,
        email: fila.email,
        rol: rol,
      };

      usuarios.push(usuario);
    }

    return usuarios;
  }

  // Uso RPC porque el cliente no tiene UPDATE sobre usuarios.rol_id: la función
  // verifica que quien llama sea administrador y que no cambie su propio rol.
  async asignarRolEmpleado(usuarioId: string, empleado: boolean): Promise<void> {
    const { error } = await this.supS.Sup.rpc('asignar_rol_empleado', {
      p_usuario_id: usuarioId,
      p_empleado: empleado,
    });
    if (error !== null) {
      const traducido = MENSAJES_RPC[error.message];

      let mensaje = 'No se pudo cambiar el rol. Probá de nuevo.';

      if (traducido !== undefined) {
        mensaje = traducido;
      }

      throw new Error(mensaje);
    }
  }
}

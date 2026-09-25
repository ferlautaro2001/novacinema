import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth-service';
import { UsuarioConRol, UsuariosService } from '../../../core/data/usuarios-service';
import type { Rol } from '../../../core/models/enumerados';
import { FiltroPipe } from '../../../shared/pipes/filtro-pipe';

const NOMBRES_ROL: Record<Rol, string> = {
  cliente: 'Cliente',
  empleado: 'Empleado',
  administrador: 'Administrador',
};

@Component({
  selector: 'nc-empleados',
  imports: [FormsModule, FiltroPipe],
  templateUrl: './empleados.html',
  styleUrl: './empleados.css',
})
export class Empleados implements OnInit {
  auth = inject(AuthService);
  private usuariosS = inject(UsuariosService);

  usuarios = signal<UsuarioConRol[]>([]);
  busqueda = signal('');
  campos: (keyof UsuarioConRol)[] = ['email', 'apellido'];

  cargando = signal(true);
  cambiando = signal<string | null>(null);
  aviso = signal<string | null>(null);
  error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const lista = await this.usuariosS.findAllConRol();
      this.usuarios.set(lista);
    } catch {
      this.error.set('No se pudo cargar el listado de usuarios. Probá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  nombreRol(rol: Rol): string {
    const nombre = NOMBRES_ROL[rol];

    return nombre;
  }

  // Pasa de cliente a empleado o al revés. El rol nuevo recién se nota cuando esa
  // persona vuelve a ingresar o recarga.
  async cambiarRol(usuario: UsuarioConRol): Promise<void> {
    let esEmpleado = false;

    if (usuario.rol === 'empleado') {
      esEmpleado = true;
    }

    const nuevoRol: Rol = esEmpleado ? 'cliente' : 'empleado';

    let pasaAEmpleado = false;

    if (nuevoRol === 'empleado') {
      pasaAEmpleado = true;
    }

    this.cambiando.set(usuario.id);
    this.aviso.set(null);
    this.error.set(null);
    try {
      await this.usuariosS.asignarRolEmpleado(usuario.id, pasaAEmpleado);
      const lista = usuariosConRol(this.usuarios(), usuario.id, nuevoRol);
      this.usuarios.set(lista);
      this.aviso.set(
        `${usuario.nombre} ${usuario.apellido} ahora es ${NOMBRES_ROL[nuevoRol]}. ` +
          'El cambio rige desde su próximo ingreso.',
      );
    } catch (e) {
      const error = e as Error;
      this.error.set(error.message);
    } finally {
      this.cambiando.set(null);
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function usuariosConRol(lista: UsuarioConRol[], id: string, rol: Rol): UsuarioConRol[] {
  const usuarios: UsuarioConRol[] = [];

  for (const usuario of lista) {
    if (usuario.id === id) {
      usuarios.push({ ...usuario, rol: rol });
    } else {
      usuarios.push(usuario);
    }
  }

  return usuarios;
}

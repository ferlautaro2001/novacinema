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
  protected readonly auth = inject(AuthService);
  private readonly usuariosS = inject(UsuariosService);

  protected readonly usuarios = signal<UsuarioConRol[]>([]);
  protected readonly busqueda = signal('');
  protected readonly campos: (keyof UsuarioConRol)[] = ['email', 'apellido'];

  protected readonly cargando = signal(true);
  protected readonly cambiando = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.usuarios.set(await this.usuariosS.findAllConRol());
    } catch {
      this.error.set('No se pudo cargar el listado de usuarios. Probá de nuevo.');
    } finally {
      this.cargando.set(false);
    }
  }

  protected nombreRol(rol: Rol): string {
    return NOMBRES_ROL[rol];
  }

  // Alterna entre cliente y empleado. El nuevo rol rige desde el próximo ingreso
  // o recarga de esa persona.
  protected async cambiarRol(usuario: UsuarioConRol): Promise<void> {
    const nuevoRol: Rol = usuario.rol === 'empleado' ? 'cliente' : 'empleado';
    this.cambiando.set(usuario.id);
    this.aviso.set(null);
    this.error.set(null);
    try {
      await this.usuariosS.asignarRolEmpleado(usuario.id, nuevoRol === 'empleado');
      this.usuarios.update((lista) =>
        lista.map((u) => (u.id === usuario.id ? { ...u, rol: nuevoRol } : u)),
      );
      this.aviso.set(
        `${usuario.nombre} ${usuario.apellido} ahora es ${NOMBRES_ROL[nuevoRol]}. ` +
          'El cambio rige desde su próximo ingreso.',
      );
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.cambiando.set(null);
    }
  }
}

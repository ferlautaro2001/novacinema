import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth-service';
import { FuncionesService } from '../../../core/data/funciones-service';
import { PeliculasService } from '../../../core/data/peliculas-service';
import { UsuariosService } from '../../../core/data/usuarios-service';
import type { FuncionParaComprar } from '../../../core/models/funcion';
import { edadEn } from '../../../core/reglas/edad';
import { CargaConsulta } from '../../../shared/ui/carga-consulta/carga-consulta';
import { Modal } from '../../../shared/ui/modal/modal';
import { CompraEstado } from '../compra-estado';
import { AdultoResponsable, type DatosAdulto } from '../adulto-responsable/adulto-responsable';

// La puerta de edad de la compra (US-07.02). Entre elegir la función y elegir
// las butacas se revisa que la edad a la fecha de la función alcance la mínima
// de la clasificación. Si no alcanza y la película lo permite, se ofrece el
// adulto responsable (US-07.03).
type EstadoPantalla = 'cargando' | 'listo' | 'error';

@Component({
  selector: 'nc-control-edad',
  imports: [RouterLink, CargaConsulta, Modal, AdultoResponsable],
  templateUrl: './control-edad.html',
  styleUrl: './control-edad.css',
})
export class ControlEdad implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private funcionesService = inject(FuncionesService);
  private peliculasService = inject(PeliculasService);
  private usuariosService = inject(UsuariosService);
  private compra = inject(CompraEstado);

  estado = signal<EstadoPantalla>('cargando');
  mensaje = signal('');
  funcion = signal<FuncionParaComprar | null>(null);
  edadMinima = signal(0);
  edad = signal(0);
  pasa = signal(false);
  modalAdulto = signal(false);

  // Solo +13 y +16 aceptan adulto responsable. Las ATP pasan siempre y las +18
  // no tienen excepción (AC-07.03.03).
  ofreceAdulto(): boolean {
    const minima = this.edadMinima();
    const pasa = this.pasa();

    let ofrece = false;

    if (pasa === false && (minima === 13 || minima === 16)) {
      ofrece = true;
    }

    return ofrece;
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('funcionId');

    if (id !== null && id !== '') {
      await this.revisarEdad(id);
    } else {
      this.estado.set('error');
      this.mensaje.set('No se encontró la función. Volvé a elegirla.');
    }
  }

  continuar(): void {
    const funcion = this.funcion();

    if (funcion !== null) {
      this.router.navigate(['/comprar', funcion.id]);
    }
  }

  abrirAdulto(): void {
    this.modalAdulto.set(true);
  }

  cerrarAdulto(): void {
    this.modalAdulto.set(false);
  }

  guardarAdulto(adulto: DatosAdulto): void {
    const funcion = this.funcion();

    this.compra.guardarAdulto(adulto);
    this.modalAdulto.set(false);

    if (funcion !== null) {
      this.router.navigate(['/comprar', funcion.id]);
    }
  }

  private async revisarEdad(id: string): Promise<void> {
    this.estado.set('cargando');

    try {
      const funcion = await this.funcionesService.buscarParaComprar(id);

      if (funcion === null) {
        this.funcion.set(null);
        this.estado.set('listo');
      } else {
        await this.compararEdades(funcion);
      }
    } catch {
      this.estado.set('error');
      this.mensaje.set('No se pudo revisar la edad. Probá de nuevo.');
    }
  }

  private async compararEdades(funcion: FuncionParaComprar): Promise<void> {
    const pelicula = await this.peliculasService.buscar(funcion.peliculaId);
    const minima = pelicula.clasificacion.edad_minima;
    const usuario = this.auth.usuario();

    this.funcion.set(funcion);
    this.edadMinima.set(minima);

    if (minima === 0) {
      this.pasa.set(true);
      this.estado.set('listo');
    } else if (usuario === null) {
      this.estado.set('error');
      this.mensaje.set('Tenés que ingresar para comprar. Probá de nuevo.');
    } else {
      await this.compararConNacimiento(funcion, usuario.id, minima);
    }
  }

  private async compararConNacimiento(
    funcion: FuncionParaComprar,
    usuarioId: string,
    minima: number,
  ): Promise<void> {
    const nacimiento = await this.usuariosService.miNacimiento(usuarioId);

    if (nacimiento === null) {
      this.estado.set('error');
      this.mensaje.set('No tenemos tu fecha de nacimiento. Completala en tu perfil.');
    } else {
      const edad = edadEn(nacimiento, funcion.comienzaEn);

      this.edad.set(edad);

      if (edad >= minima) {
        this.pasa.set(true);
      }

      this.estado.set('listo');
    }
  }
}

import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CatalogoService } from '../../../../core/data/catalogo-service';
import { PeliculasService, errorPelicula } from '../../../../core/data/peliculas-service';
import { StorageService, validarPortada } from '../../../../core/data/storage-service';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';
import { Clasificacion as ClasificacionCatalogo, Genero } from '../../../../core/models/catalogo';
import { EstadoPelicula } from '../../../../core/models/enumerados';
import {
  DatosPelicula,
  GENEROS_PELICULA,
  nombreGenero,
  PeliculaConCatalogo,
} from '../../../../core/models/pelicula';
import { CampoTexto } from '../../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../../shared/ui/error-campo/error-campo';
import { SelectorFecha } from '../../../../shared/ui/selector-fecha/selector-fecha';
import { alMenosUno, textoRequerido } from '../../../../shared/validadores/al-menos-uno';

@Component({
  selector: 'nc-formulario-pelicula',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, CampoTexto, ErrorCampo, SelectorFecha],
  templateUrl: './formulario-pelicula.html',
  styleUrl: './formulario-pelicula.css',
  host: { '(window:beforeunload)': 'antesDeSalir($event)' },
})
export class FormularioPelicula implements OnInit, OnDestroy, FormularioConCambios {
  private fb = inject(FormBuilder).nonNullable;
  private catalogo = inject(CatalogoService);
  private peliculas = inject(PeliculasService);
  private storage = inject(StorageService);
  private ruta = inject(ActivatedRoute);
  private router = inject(Router);

  form = this.fb.group({
    titulo: ['', textoRequerido],
    sinopsis: ['', textoRequerido],
    duracion_min: [
      120,
      [Validators.required, Validators.min(1), Validators.max(300), Validators.pattern(/^\d+$/)],
    ],
    clasificacion_id: [0, Validators.min(1)],
    imagen_path: ['', Validators.required],
    fecha_estreno: ['', Validators.required],
    estado: this.fb.control<EstadoPelicula>('proximamente'),
    generos: this.fb.array<boolean>([], alMenosUno),
  });

  generos = signal<Genero[]>([]);
  clasificaciones = signal<ClasificacionCatalogo[]>([]);
  original = signal<PeliculaConCatalogo | null>(null);
  cargando = signal(true);
  falloCarga = signal(false);
  guardando = signal(false);
  error = signal('');
  errorArchivo = signal('');
  preview = signal('');
  duracionBloqueada = signal(false);

  private archivo: File | null = null;
  private objetoUrl = '';
  private rutaSubida = '';
  private guardado = false;
  // Cuento las cargas para descartar la respuesta de una carga vieja si cambió el id.
  private secuencia = 0;
  private suscripcion?: Subscription;

  ngOnInit(): void {
    this.suscripcion = this.ruta.paramMap.subscribe((parametros) => this.alCambiarRuta(parametros));
  }

  ngOnDestroy(): void {
    this.secuencia++;

    if (this.suscripcion !== undefined) {
      this.suscripcion.unsubscribe();
    }

    if (this.objetoUrl !== '') {
      URL.revokeObjectURL(this.objetoUrl);
    }
    // Acá no borro la portada subida: si la red respondió mal, puede que se haya guardado igual.
  }

  noGuardado(): boolean {
    let bandera = false;

    if (this.form.dirty && this.guardado === false) {
      bandera = true;
    }

    return bandera;
  }

  antesDeSalir(evento: BeforeUnloadEvent): void {
    if (this.noGuardado()) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  }

  async reintentar(): Promise<void> {
    const id = this.ruta.snapshot.paramMap.get('id');

    await this.cargar(id);
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];

    let bandera = false;

    if (control.touched && control.invalid) {
      bandera = true;
    }

    return bandera;
  }

  elegirFecha(fecha: Date): void {
    const anio = fecha.getFullYear();
    const numeroMes = fecha.getMonth() + 1;
    const mes = String(numeroMes).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const fechaTexto = `${anio}-${mes}-${dia}`;

    this.form.controls.fecha_estreno.setValue(fechaTexto);
    this.form.controls.fecha_estreno.markAsDirty();
  }

  elegirArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;

    let archivo: File | undefined = undefined;

    if (input.files !== null) {
      archivo = input.files[0];
    }

    if (archivo !== undefined) {
      const error = validarPortada(archivo);

      let mensajeError = '';

      if (error !== null) {
        mensajeError = error;
      }

      this.errorArchivo.set(mensajeError);

      if (error !== null && error !== '') {
        input.value = '';
      } else {
        this.usarArchivo(archivo);
      }
    }
  }

  async guardar(): Promise<void> {
    if (this.guardando() === false) {
      this.form.markAllAsTouched();

      let hayErrores = false;

      if (this.form.invalid) {
        hayErrores = true;
      } else if (this.errorArchivo() !== '') {
        hayErrores = true;
      }

      if (hayErrores === false) {
        await this.guardarPelicula();
      }
    }
  }

  // ─── Auxiliares ─────────────────────────────────────────────────────

  private alCambiarRuta(parametros: ParamMap): void {
    const id = parametros.get('id');

    this.cargar(id);
  }

  private async cargar(id: string | null): Promise<void> {
    this.secuencia++;
    const secuencia = this.secuencia;

    this.cargando.set(true);
    this.falloCarga.set(false);
    this.error.set('');

    try {
      const busquedaGeneros = this.catalogo.findAllGeneros();
      const busquedaClasificaciones = this.catalogo.findAllClasificaciones();

      let busquedaPelicula: Promise<PeliculaConCatalogo | null> = Promise.resolve(null);
      let busquedaBloqueo: Promise<boolean> = Promise.resolve(false);

      if (id !== null && id !== '') {
        busquedaPelicula = this.peliculas.buscar(id);
        busquedaBloqueo = this.peliculas.tieneFuncionesFuturas(id);
      }

      const resultados = await Promise.all([
        busquedaGeneros,
        busquedaClasificaciones,
        busquedaPelicula,
        busquedaBloqueo,
      ]);
      const generos = resultados[0];
      const clasificaciones = resultados[1];
      const pelicula = resultados[2];
      const bloqueada = resultados[3];

      if (secuencia === this.secuencia) {
        this.aplicarCarga(generos, clasificaciones, pelicula, bloqueada);
      }
    } catch {
      if (secuencia === this.secuencia) {
        this.falloCarga.set(true);
        this.error.set('No se pudo abrir la película o cargar sus opciones. Volvé a intentarlo.');
      }
    } finally {
      if (secuencia === this.secuencia) {
        this.cargando.set(false);
      }
    }
  }

  private aplicarCarga(
    generos: Genero[],
    clasificaciones: ClasificacionCatalogo[],
    pelicula: PeliculaConCatalogo | null,
    bloqueada: boolean,
  ): void {
    this.original.set(pelicula);
    this.duracionBloqueada.set(bloqueada);
    this.clasificaciones.set(clasificaciones);

    // En un alta ofrezco los 13 géneros del backlog. Si edito, también dejo los
    // géneros viejos que ya tenía la película para no cambiárselos sin avisar.
    const disponibles: Genero[] = [];

    for (const genero of generos) {
      const nombre = nombreGenero(genero.nombre);

      let estaDisponible = false;

      if (genero.activo) {
        if (GENEROS_PELICULA.includes(nombre)) {
          estaDisponible = true;
        } else if (this.tieneGenero(pelicula, genero.id)) {
          estaDisponible = true;
        }
      }

      if (estaDisponible) {
        disponibles.push({ ...genero, nombre });
      }
    }

    this.generos.set(disponibles);

    this.form.controls.generos.clear();

    for (const genero of disponibles) {
      const loTiene = this.tieneGenero(pelicula, genero.id);
      const control = this.fb.control(loTiene);

      this.form.controls.generos.push(control);
    }

    if (pelicula !== null) {
      this.form.patchValue(pelicula);
    } else {
      this.form.patchValue({
        titulo: '',
        sinopsis: '',
        duracion_min: 120,
        clasificacion_id: 0,
        imagen_path: '',
        fecha_estreno: '',
        estado: 'proximamente',
      });
    }

    if (bloqueada) {
      this.form.controls.duracion_min.disable();
    } else {
      this.form.controls.duracion_min.enable();
    }

    let preview = '';

    if (pelicula !== null) {
      preview = this.storage.urlPublica(pelicula.imagen_path);
    }

    this.preview.set(preview);
    this.archivo = null;
    this.rutaSubida = '';
    this.guardado = false;
    this.form.markAsPristine();
  }

  private tieneGenero(pelicula: PeliculaConCatalogo | null, id: number): boolean {
    let bandera = false;

    if (pelicula !== null) {
      for (const peliculaGenero of pelicula.pelicula_generos) {
        if (peliculaGenero.genero.id === id) {
          bandera = true;
        }
      }
    }

    return bandera;
  }

  private usarArchivo(archivo: File): void {
    if (this.objetoUrl !== '') {
      URL.revokeObjectURL(this.objetoUrl);
    }

    this.archivo = archivo;
    this.rutaSubida = '';
    this.objetoUrl = URL.createObjectURL(archivo);
    this.preview.set(this.objetoUrl);
    this.form.controls.imagen_path.setValue(archivo.name);
    this.form.controls.imagen_path.markAsDirty();
  }

  private async guardarPelicula(): Promise<void> {
    this.guardando.set(true);
    this.error.set('');

    try {
      // Si un intento anterior ya subió la portada, no la vuelvo a subir.
      if (this.archivo !== null && this.rutaSubida === '') {
        this.rutaSubida = await this.storage.subirPortada(this.archivo);
      }

      const valores = this.form.getRawValue();
      const datos: DatosPelicula = {
        titulo: valores.titulo,
        sinopsis: valores.sinopsis,
        duracion_min: valores.duracion_min,
        clasificacion_id: valores.clasificacion_id,
        imagen_path: valores.imagen_path,
        fecha_estreno: valores.fecha_estreno,
        estado: valores.estado,
      };

      if (this.rutaSubida !== '') {
        datos.imagen_path = this.rutaSubida;
      }

      const ids: number[] = [];
      const generosDisponibles = this.generos();

      for (let indice = 0; indice < generosDisponibles.length; indice++) {
        if (valores.generos[indice] === true) {
          ids.push(generosDisponibles[indice].id);
        }
      }

      await this.peliculas.guardar(datos, ids, this.original());
      this.guardado = true;

      let esEdicion = false;

      if (this.original() !== null) {
        esEdicion = true;
      }

      const mensaje = esEdicion ? 'Película actualizada' : 'Película creada';

      await this.router.navigateByUrl('/admin/peliculas', {
        state: { peliculaGuardada: mensaje },
      });
    } catch (excepcion) {
      const mensajeError = errorPelicula(excepcion);

      this.error.set(mensajeError);
    } finally {
      this.guardando.set(false);
    }
  }
}

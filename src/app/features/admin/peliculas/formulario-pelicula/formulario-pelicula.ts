import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CatalogoService } from '../../../../core/data/catalogo-service';
import { PeliculasService, errorPelicula } from '../../../../core/data/peliculas-service';
import { StorageService, validarPortada } from '../../../../core/data/storage-service';
import { FormularioConCambios } from '../../../../core/guards/cambios-pendientes-guard';
import { Clasificacion as ClasificacionCatalogo, Genero } from '../../../../core/models/catalogo';
import { EstadoPelicula } from '../../../../core/models/enumerados';
import {
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
    this.suscripcion = this.ruta.paramMap.subscribe((params) => {
      this.cargar(params.get('id'));
    });
  }

  ngOnDestroy(): void {
    this.secuencia++;
    this.suscripcion?.unsubscribe();
    if (this.objetoUrl) {
      URL.revokeObjectURL(this.objetoUrl);
    }
    // Acá no borro la portada subida: si la red respondió mal, puede que se haya guardado igual.
  }

  noGuardado(): boolean {
    return this.form.dirty && !this.guardado;
  }

  antesDeSalir(evento: BeforeUnloadEvent): void {
    if (this.noGuardado()) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  }

  async reintentar(): Promise<void> {
    await this.cargar(this.ruta.snapshot.paramMap.get('id'));
  }

  private async cargar(id: string | null): Promise<void> {
    const secuencia = ++this.secuencia;
    this.cargando.set(true);
    this.falloCarga.set(false);
    this.error.set('');
    try {
      const [generos, clasificaciones, pelicula, bloqueada] = await Promise.all([
        this.catalogo.findAllGeneros(),
        this.catalogo.findAllClasificaciones(),
        id ? this.peliculas.buscar(id) : null,
        id ? this.peliculas.tieneFuncionesFuturas(id) : false,
      ]);
      if (secuencia !== this.secuencia) return;

      this.original.set(pelicula);
      this.duracionBloqueada.set(bloqueada);
      this.clasificaciones.set(clasificaciones);

      // En un alta ofrezco los 13 géneros del backlog. Si edito, también dejo los
      // géneros viejos que ya tenía la película para no cambiárselos sin avisar.
      const disponibles: Genero[] = [];
      for (const g of generos) {
        const nombre = nombreGenero(g.nombre);
        if (g.activo && (GENEROS_PELICULA.includes(nombre) || this.tieneGenero(pelicula, g.id))) {
          disponibles.push({ ...g, nombre });
        }
      }
      this.generos.set(disponibles);

      this.form.controls.generos.clear();
      for (const g of disponibles) {
        this.form.controls.generos.push(this.fb.control(this.tieneGenero(pelicula, g.id)));
      }

      this.form.patchValue(
        pelicula ?? {
          titulo: '',
          sinopsis: '',
          duracion_min: 120,
          clasificacion_id: 0,
          imagen_path: '',
          fecha_estreno: '',
          estado: 'proximamente',
        },
      );
      if (bloqueada) {
        this.form.controls.duracion_min.disable();
      } else {
        this.form.controls.duracion_min.enable();
      }

      this.preview.set(pelicula ? this.storage.urlPublica(pelicula.imagen_path) : '');
      this.archivo = null;
      this.rutaSubida = '';
      this.guardado = false;
      this.form.markAsPristine();
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

  private tieneGenero(pelicula: PeliculaConCatalogo | null, id: number): boolean {
    if (!pelicula) return false;
    return pelicula.pelicula_generos.some((pg) => pg.genero.id === id);
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.touched && control.invalid;
  }

  elegirFecha(fecha: Date): void {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    this.form.controls.fecha_estreno.setValue(`${anio}-${mes}-${dia}`);
    this.form.controls.fecha_estreno.markAsDirty();
  }

  elegirArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    const error = validarPortada(archivo);
    this.errorArchivo.set(error ?? '');
    if (error) {
      input.value = '';
      return;
    }

    if (this.objetoUrl) {
      URL.revokeObjectURL(this.objetoUrl);
    }
    this.archivo = archivo;
    this.rutaSubida = '';
    this.objetoUrl = URL.createObjectURL(archivo);
    this.preview.set(this.objetoUrl);
    this.form.controls.imagen_path.setValue(archivo.name);
    this.form.controls.imagen_path.markAsDirty();
  }

  async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || this.errorArchivo()) return;

    this.guardando.set(true);
    this.error.set('');
    try {
      // Si un intento anterior ya subió la portada, no la vuelvo a subir.
      if (this.archivo && !this.rutaSubida) {
        this.rutaSubida = await this.storage.subirPortada(this.archivo);
      }
      const { generos, ...datos } = this.form.getRawValue();
      if (this.rutaSubida) {
        datos.imagen_path = this.rutaSubida;
      }

      const ids: number[] = [];
      this.generos().forEach((g, i) => {
        if (generos[i]) ids.push(g.id);
      });

      await this.peliculas.guardar(datos, ids, this.original());
      this.guardado = true;
      await this.router.navigateByUrl('/admin/peliculas', {
        state: { peliculaGuardada: this.original() ? 'Película actualizada' : 'Película creada' },
      });
    } catch (e) {
      this.error.set(errorPelicula(e));
    } finally {
      this.guardando.set(false);
    }
  }
}

import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CatalogoService } from '../../../core/data/catalogo-service';
import { PeliculasService, errorPelicula } from '../../../core/data/peliculas-service';
import { StorageService, validarPortada } from '../../../core/data/storage-service';
import { FormularioConCambios } from '../../../core/guards/cambios-pendientes-guard';
import { Clasificacion as ClasificacionCatalogo, Genero } from '../../../core/models/catalogo';
import { EstadoPelicula } from '../../../core/models/enumerados';
import { GENEROS_PELICULA, nombreGenero, PeliculaConCatalogo } from '../../../core/models/pelicula';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';
import { SelectorFecha } from '../../../shared/ui/selector-fecha/selector-fecha';
import { alMenosUno, textoRequerido } from '../../../shared/validadores/al-menos-uno';

@Component({
  selector: 'nc-formulario-pelicula',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, CampoTexto, ErrorCampo, SelectorFecha],
  templateUrl: './formulario-pelicula.html',
  styleUrl: './formulario-pelicula.css',
  host: { '(window:beforeunload)': 'antesDeSalir($event)' },
})
export class FormularioPelicula implements OnInit, OnDestroy, FormularioConCambios {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly catalogo = inject(CatalogoService);
  private readonly peliculas = inject(PeliculasService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);
  protected readonly form = this.fb.group({
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
  protected readonly generos = signal<Genero[]>([]);
  protected readonly clasificaciones = signal<ClasificacionCatalogo[]>([]);
  protected readonly original = signal<PeliculaConCatalogo | null>(null);
  protected readonly cargando = signal(true);
  protected readonly falloCarga = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal('');
  protected readonly errorArchivo = signal('');
  protected readonly preview = signal('');
  protected readonly duracionBloqueada = signal(false);
  private archivo: File | null = null;
  private objetoUrl = '';
  private rutaSubida = '';
  private guardado = false;
  private secuencia = 0;
  private eventos?: Subscription;
  protected readonly revision = signal(0);

  ngOnInit(): void {
    this.eventos = this.form.events.subscribe(() => this.revision.update((v) => v + 1));
    void this.cargar();
  }
  ngOnDestroy(): void {
    this.secuencia++;
    this.eventos?.unsubscribe();
    if (this.objetoUrl) URL.revokeObjectURL(this.objetoUrl);
    // No se borra una subida aquí: una respuesta de red ambigua podría haberla guardado.
  }
  noGuardado(): boolean {
    return this.form.dirty && !this.guardado;
  }
  protected antesDeSalir(evento: BeforeUnloadEvent): void {
    if (this.noGuardado()) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  }
  protected async reintentar(): Promise<void> { await this.cargar(); }
  private async cargar(): Promise<void> {
    const secuencia = ++this.secuencia;
    this.cargando.set(true); this.falloCarga.set(false); this.error.set('');
    try {
      const [generos, clasificaciones] = await Promise.all([
        this.catalogo.findAllGeneros(), this.catalogo.findAllClasificaciones(),
      ]);
      if (secuencia !== this.secuencia) return;
      this.generos.set(generos.map(g => ({ ...g, nombre: nombreGenero(g.nombre) }))
        .filter(g => g.activo && GENEROS_PELICULA.includes(g.nombre)));
      this.clasificaciones.set(clasificaciones);
      this.form.controls.generos.clear();
      for (const g of this.generos()) this.form.controls.generos.push(this.fb.control(false));
    } catch {
      if (secuencia === this.secuencia) {
        this.falloCarga.set(true);
        this.error.set('No se pudieron cargar las opciones. Volvé a intentarlo.');
      }
    } finally { if (secuencia === this.secuencia) this.cargando.set(false); }
  }
  protected invalido(campo: keyof typeof this.form.controls): boolean {
    this.revision();
    const control = this.form.controls[campo];
    return control.touched && control.invalid;
  }
  protected elegirFecha(fecha: Date): void {
    const iso = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    this.form.controls.fecha_estreno.setValue(iso);
    this.form.controls.fecha_estreno.markAsDirty();
  }
  protected elegirArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;
    const error = validarPortada(archivo);
    this.errorArchivo.set(error ?? '');
    if (error) {
      input.value = '';
      return;
    }
    if (this.objetoUrl) URL.revokeObjectURL(this.objetoUrl);
    this.archivo = archivo;
    this.rutaSubida = '';
    this.objetoUrl = URL.createObjectURL(archivo);
    this.preview.set(this.objetoUrl);
    this.form.controls.imagen_path.setValue(archivo.name);
    this.form.controls.imagen_path.markAsDirty();
  }
  protected async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || this.errorArchivo()) return;
    this.guardando.set(true);
    this.error.set('');
    try {
      if (this.archivo && !this.rutaSubida)
        this.rutaSubida = await this.storage.subirPortada(this.archivo);
      const { generos, ...datos } = this.form.getRawValue();
      if (this.rutaSubida) datos.imagen_path = this.rutaSubida;
      const ids = this.generos()
        .filter((_, i) => generos[i])
        .map((g) => g.id);
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

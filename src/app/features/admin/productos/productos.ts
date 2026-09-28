import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandyService } from '../../../core/data/candy-service';
import { CatalogoService } from '../../../core/data/catalogo-service';
import { StorageService, validarPortada } from '../../../core/data/storage-service';
import { FormularioConCambios } from '../../../core/guards/cambios-pendientes-guard';
import type { CategoriaProducto } from '../../../core/models/catalogo';
import type { DatosProducto, ProductoConPrecio } from '../../../core/models/candy';
import { Cargando, EstadoConsulta } from '../../../shared/directivas/cargando';
import { textoRequerido } from '../../../shared/validadores/al-menos-uno';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';

// Los productos del Candy en el Panel (US-08.01): el catálogo con precio y
// disponibilidad, y el alta de un producto nuevo en la misma pantalla.
//
// El formulario vive acá y no en una ruta aparte porque el scaffolding reserva
// una sola pantalla para productos. La ruta declara cambiosPendientesGuard, así
// que un alta a medio cargar no se pierde al salir sin querer.
@Component({
  selector: 'nc-productos',
  imports: [ReactiveFormsModule, CurrencyPipe, Cargando, CampoTexto, ErrorCampo],
  templateUrl: './productos.html',
  styleUrl: './productos.css',
  host: { '(window:beforeunload)': 'antesDeSalir($event)' },
})
export class Productos implements OnInit, OnDestroy, FormularioConCambios {
  private fb = inject(FormBuilder).nonNullable;
  private candy = inject(CandyService);
  private catalogo = inject(CatalogoService);
  storage = inject(StorageService);

  estado = signal<EstadoConsulta<ProductoConPrecio>>({ tipo: 'cargando' });
  categorias = signal<CategoriaProducto[]>([]);
  formularioAbierto = signal(false);
  guardando = signal(false);
  aviso = signal('');
  error = signal('');
  errorArchivo = signal('');
  preview = signal('');

  // El precio llega como texto desde el input number (campo-texto). min(0.01)
  // lo compara como número y deja pasar solo precios mayores que 0.
  form = this.fb.group({
    nombre: ['', textoRequerido],
    descripcion: ['', textoRequerido],
    categoriaId: [0, Validators.min(1)],
    precio: [
      '',
      [Validators.required, Validators.min(0.01), Validators.pattern(/^\d+([.,]\d{1,2})?$/)],
    ],
    imagen: ['', Validators.required],
  });

  private archivo: File | null = null;
  private objetoUrl = '';

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  ngOnDestroy(): void {
    this.liberarPreview();
  }

  noGuardado(): boolean {
    let bandera = false;

    if (this.formularioAbierto() && this.form.dirty) {
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

  async cargar(): Promise<void> {
    this.estado.set({ tipo: 'cargando' });

    try {
      const productos = await this.candy.listarParaPanel();
      const categorias = await this.catalogo.findAllCategoriasProducto();

      this.categorias.set(categorias);
      this.estado.set({ tipo: 'datos', datos: productos });
    } catch {
      this.estado.set({
        tipo: 'error',
        mensaje: 'No se pudieron cargar los productos. Probá de nuevo.',
      });
    }
  }

  abrirFormulario(): void {
    this.aviso.set('');
    this.formularioAbierto.set(true);
  }

  cancelar(): void {
    this.cerrarFormulario();
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];

    let bandera = false;

    if (control.touched && control.invalid) {
      bandera = true;
    }

    return bandera;
  }

  elegirArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;

    let archivo: File | undefined = undefined;

    if (input.files !== null) {
      archivo = input.files[0];
    }

    if (archivo !== undefined) {
      const error = validarPortada(archivo);

      if (error === null) {
        this.errorArchivo.set('');
        this.usarArchivo(archivo);
      } else {
        this.errorArchivo.set(error);
        input.value = '';
      }
    }
  }

  async guardar(): Promise<void> {
    if (this.guardando() === false) {
      this.form.markAllAsTouched();

      if (this.form.valid && this.archivo !== null) {
        await this.guardarProducto(this.archivo);
      }
    }
  }

  // "Disponible" o "No disponible": el estado siempre va con palabra.
  nombreEstado(producto: ProductoConPrecio): string {
    const disponible = producto.activo;
    const nombre = disponible ? 'Disponible' : 'No disponible';

    return nombre;
  }

  // ─── Auxiliares ─────────────────────────────────────────────────────

  private usarArchivo(archivo: File): void {
    this.liberarPreview();
    this.archivo = archivo;
    this.objetoUrl = URL.createObjectURL(archivo);
    this.preview.set(this.objetoUrl);
    this.form.controls.imagen.setValue(archivo.name);
    this.form.controls.imagen.markAsDirty();
  }

  private liberarPreview(): void {
    if (this.objetoUrl !== '') {
      URL.revokeObjectURL(this.objetoUrl);
      this.objetoUrl = '';
    }
  }

  // Primero la imagen: si falla, no se crea nada. Si falla el alta, se borra la
  // imagen subida para no dejar archivos sueltos en el bucket.
  private async guardarProducto(archivo: File): Promise<void> {
    this.guardando.set(true);
    this.error.set('');

    let rutaSubida = '';

    try {
      rutaSubida = await this.storage.subirPortada(archivo, 'productos');

      const valores = this.form.getRawValue();
      const precio = Number(valores.precio.replace(',', '.'));
      const datos: DatosProducto = {
        nombre: valores.nombre.trim(),
        descripcion: valores.descripcion.trim(),
        categoriaId: valores.categoriaId,
        imagenPath: rutaSubida,
        precio,
      };

      await this.candy.crear(datos);
      this.cerrarFormulario();
      this.aviso.set(`Producto “${datos.nombre}” creado`);
      await this.cargar();
    } catch {
      if (rutaSubida !== '') {
        await this.borrarImagenSuelta(rutaSubida);
      }

      this.error.set('No se pudo guardar el producto. Probá de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }

  // Si tampoco se puede borrar, queda el archivo en el bucket: no hay más que
  // hacer desde el navegador y el error que importa es el del alta.
  private async borrarImagenSuelta(ruta: string): Promise<void> {
    try {
      await this.storage.eliminarPortada(ruta);
    } catch {
      // Se ignora a propósito: ver arriba.
    }
  }

  private cerrarFormulario(): void {
    this.form.reset();
    this.archivo = null;
    this.liberarPreview();
    this.preview.set('');
    this.errorArchivo.set('');
    this.error.set('');
    this.formularioAbierto.set(false);
  }
}

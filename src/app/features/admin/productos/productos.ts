import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CandyService, ProductoRechazado } from '../../../core/data/candy-service';
import { CatalogoService } from '../../../core/data/catalogo-service';
import { StorageService, validarPortada } from '../../../core/data/storage-service';
import { FormularioConCambios } from '../../../core/guards/cambios-pendientes-guard';
import type { CategoriaProducto } from '../../../core/models/catalogo';
import type { DatosProducto, ProductoConPrecio } from '../../../core/models/candy';
import { Cargando, EstadoConsulta } from '../../../shared/directivas/cargando';
import { FocoInicial } from '../../../shared/directivas/foco-inicial';
import { textoRequerido } from '../../../shared/validadores/al-menos-uno';
import { CampoTexto } from '../../../shared/ui/campo-texto/campo-texto';
import { ErrorCampo } from '../../../shared/ui/error-campo/error-campo';
import { Modal } from '../../../shared/ui/modal/modal';
import { TablaDatos } from '../../../shared/ui/tabla-datos/tabla-datos';

type AccionProducto = 'disponibilidad' | 'eliminar';

// Los productos del Candy en el Panel: el catálogo con precio y disponibilidad,
// el alta (US-08.01) y la edición, la baja lógica y la eliminación (US-08.02).
//
// El formulario vive acá y no en una ruta aparte porque el scaffolding reserva
// una sola pantalla para productos. Sirve para el alta y para editar; la ruta
// declara cambiosPendientesGuard, así que un cambio a medio cargar no se pierde
// al salir sin querer.
@Component({
  selector: 'nc-productos',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    Cargando,
    FocoInicial,
    CampoTexto,
    ErrorCampo,
    Modal,
    TablaDatos,
  ],
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
  // El producto que se está editando; null es un alta.
  editando = signal<ProductoConPrecio | null>(null);
  confirmacion = signal<ProductoConPrecio | null>(null);
  guardando = signal(false);
  trabajando = signal(false);
  aviso = signal('');
  error = signal('');
  errorAccion = signal('');
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

  abrirAlta(): void {
    this.cerrarFormulario();
    this.aviso.set('');
    this.formularioAbierto.set(true);
  }

  // La edición usa el mismo formulario con los datos cargados. La imagen actual
  // cuenta como elegida: solo se sube una nueva si el administrador la cambia.
  abrirEdicion(producto: ProductoConPrecio): void {
    this.cerrarFormulario();
    this.aviso.set('');
    this.editando.set(producto);

    let precio = '';

    if (producto.precio !== null) {
      precio = String(producto.precio);
    }

    this.form.setValue({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      categoriaId: producto.categoriaId,
      precio,
      imagen: producto.imagenPath,
    });

    const url = this.storage.urlPublica(producto.imagenPath);

    this.preview.set(url);
    this.form.markAsPristine();
    this.formularioAbierto.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

      if (this.form.valid) {
        await this.guardarProducto();
      }
    }
  }

  // Las acciones de la tabla, una por vez, con su aviso o su error. No
  // disponible saca el producto del menú sin borrarlo (AC-08.02.02); eliminar
  // solo funciona si nunca se usó (AC-08.02.03).
  async accion(tipo: AccionProducto, producto: ProductoConPrecio): Promise<void> {
    if (this.trabajando() === false) {
      this.trabajando.set(true);
      this.aviso.set('');
      this.errorAccion.set('');

      try {
        await this.ejecutar(tipo, producto);
        this.confirmacion.set(null);

        const mensaje = mensajeDeAccion(tipo, producto);

        this.aviso.set(mensaje);
        await this.cargar();
      } catch (excepcion) {
        this.confirmacion.set(null);

        const mensajeError = mensajeDeError(excepcion);

        this.errorAccion.set(mensajeError);
      } finally {
        this.trabajando.set(false);
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

  private async ejecutar(tipo: AccionProducto, producto: ProductoConPrecio): Promise<void> {
    switch (tipo) {
      case 'disponibilidad':
        await this.candy.cambiarDisponibilidad(producto.id, !producto.activo);
        break;

      case 'eliminar':
        await this.eliminarConImagen(producto);
        break;
    }
  }

  // La imagen se borra después del producto: si el producto no se puede
  // eliminar, la imagen tiene que seguir.
  private async eliminarConImagen(producto: ProductoConPrecio): Promise<void> {
    await this.candy.eliminar(producto.id);
    await this.borrarImagenSuelta(producto.imagenPath);
  }

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

  // Primero la imagen nueva, si hay: si falla, no se toca nada. Si falla el
  // guardado, se borra la imagen recién subida; si sale bien y era una edición,
  // se borra la imagen vieja que quedó reemplazada.
  private async guardarProducto(): Promise<void> {
    const original = this.editando();

    this.guardando.set(true);
    this.error.set('');

    let rutaSubida = '';

    try {
      if (this.archivo !== null) {
        rutaSubida = await this.storage.subirPortada(this.archivo, 'productos');
      }

      const datos = this.datosDelFormulario(original, rutaSubida);

      if (original === null) {
        await this.candy.crear(datos);
        this.aviso.set(`Producto “${datos.nombre}” creado`);
      } else {
        await this.candy.actualizar(original.id, datos, original.precio);
        this.aviso.set(`Producto “${datos.nombre}” actualizado`);

        if (rutaSubida !== '') {
          await this.borrarImagenSuelta(original.imagenPath);
        }
      }

      this.cerrarFormulario();
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

  private datosDelFormulario(
    original: ProductoConPrecio | null,
    rutaSubida: string,
  ): DatosProducto {
    const valores = this.form.getRawValue();
    const precio = Number(valores.precio.replace(',', '.'));

    let imagenPath = rutaSubida;

    if (imagenPath === '' && original !== null) {
      imagenPath = original.imagenPath;
    }

    const datos: DatosProducto = {
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim(),
      categoriaId: valores.categoriaId,
      imagenPath,
      precio,
    };

    return datos;
  }

  // Si tampoco se puede borrar, queda el archivo en el bucket: no hay más que
  // hacer desde el navegador y el error que importa es el del guardado.
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
    this.editando.set(null);
    this.formularioAbierto.set(false);
  }
}

// ─── Auxiliares del módulo ──────────────────────────────────────────

// El aviso que queda arriba de la tabla después de cada acción.
function mensajeDeAccion(tipo: AccionProducto, producto: ProductoConPrecio): string {
  let mensaje = `Producto “${producto.nombre}” eliminado`;

  if (tipo === 'disponibilidad') {
    if (producto.activo) {
      mensaje = `“${producto.nombre}” quedó no disponible`;
    } else {
      mensaje = `“${producto.nombre}” vuelve a estar disponible`;
    }
  }

  return mensaje;
}

function mensajeDeError(excepcion: unknown): string {
  let mensaje = 'No se pudo completar la acción. Probá de nuevo.';

  if (excepcion instanceof ProductoRechazado) {
    mensaje = excepcion.message;
  }

  return mensaje;
}

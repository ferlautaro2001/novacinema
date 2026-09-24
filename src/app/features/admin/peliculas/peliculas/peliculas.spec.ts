import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Peliculas } from './peliculas';
import { PeliculasService, ERROR_HISTORIAL } from '../../../../core/data/peliculas-service';
import { StorageService } from '../../../../core/data/storage-service';
import { PeliculaConCatalogo } from '../../../../core/models/pelicula';

export const peliculaPrueba: PeliculaConCatalogo = {
  id: 'pelicula',
  titulo: 'Dune: Parte Tres',
  sinopsis: 'Una historia extensa. '.repeat(9),
  duracion_min: 165,
  clasificacion_id: 2,
  imagen_path: 'peliculas/dune.jpg',
  fecha_estreno: '2026-10-22',
  estado: 'proximamente',
  activo: true,
  destacada: false,
  creado_en: '',
  actualizado_en: '2026-09-24T12:00:00Z',
  clasificacion: { codigo: '+13', edad_minima: 13 },
  pelicula_generos: [{ genero: { id: 1, nombre: 'Ciencia ficción' } }],
};

describe('Catálogo EP-03', () => {
  const listar = vi.fn();
  const eliminar = vi.fn();
  const destacar = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    listar.mockResolvedValue([peliculaPrueba]);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value() {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value() {
        this.open = false;
      },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PeliculasService, useValue: { listar, eliminar, destacar } },
        { provide: StorageService, useValue: { urlPublica: (ruta: string) => ruta } },
      ],
    });
  });
  it('muestra todos los datos, clasificación y sinopsis de hasta 80 caracteres', async () => {
    const fixture = TestBed.createComponent(Peliculas);
    await fixture.whenStable();
    const raiz: HTMLElement = fixture.nativeElement;
    expect(raiz.textContent).toContain('Dune: Parte Tres');
    expect(raiz.textContent).toContain('Ciencia ficción');
    expect(raiz.textContent).toContain('+13');
    expect(raiz.textContent).toContain('2 h 45 min');
    expect(raiz.querySelector('.sinopsis')!.textContent!.trim()).toHaveLength(80);
    expect(raiz.querySelector('.sinopsis')!.textContent).toContain('…');
  });
  it('distingue catálogo vacío de consulta fallida', async () => {
    listar.mockResolvedValue([]);
    const fixture = TestBed.createComponent(Peliculas);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Todavía no cargaste películas');
    fixture.destroy();
    listar.mockRejectedValue(new Error('sin red'));
    const otro = TestBed.createComponent(Peliculas);
    await otro.whenStable();
    expect(otro.nativeElement.textContent).toContain('No se pudo cargar el catálogo');
    expect(otro.nativeElement.textContent).not.toContain('Todavía no cargaste');
  });
  it('no elimina sin confirmación y conserva el historial si la base rechaza', async () => {
    eliminar.mockRejectedValue(new Error(ERROR_HISTORIAL));
    const fixture = TestBed.createComponent(Peliculas);
    await fixture.whenStable();
    const raiz: HTMLElement = fixture.nativeElement;
    const boton = (texto: string) =>
      [...raiz.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto)!;
    boton('Eliminar').click();
    await fixture.whenStable();
    expect(eliminar).not.toHaveBeenCalled();
    boton('Confirmar eliminación').click();
    await fixture.whenStable();
    expect(eliminar).toHaveBeenCalledWith(peliculaPrueba);
    expect(raiz.querySelector('[role=alert]')?.textContent).toContain(ERROR_HISTORIAL);
    expect(raiz.textContent).toContain('Dune: Parte Tres');
  });
});

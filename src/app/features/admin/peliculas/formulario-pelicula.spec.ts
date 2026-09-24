import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { FormularioPelicula } from './formulario-pelicula';
import { PeliculasService } from '../../../core/data/peliculas-service';
import { CatalogoService } from '../../../core/data/catalogo-service';
import { StorageService } from '../../../core/data/storage-service';

describe('Formulario EP-03', () => {
  const guardar = vi.fn();
  const subirPortada = vi.fn();
  const buscar = vi.fn();
  const tieneFuncionesFuturas = vi.fn();
  let id: string | null;
  beforeEach(() => {
    vi.resetAllMocks();
    id = null;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useFactory: () => ({ paramMap: of(convertToParamMap(id ? { id } : {})) }),
        },
        { provide: PeliculasService, useValue: { guardar, buscar, tieneFuncionesFuturas } },
        {
          provide: CatalogoService,
          useValue: {
            findAllGeneros: () =>
              Promise.resolve([
                { id: 1, nombre: 'Acción', activo: true },
                { id: 2, nombre: 'Aventura', activo: true },
              ]),
            findAllClasificaciones: () =>
              Promise.resolve([
                { id: 1, codigo: 'ATP' },
                { id: 2, codigo: '+13' },
                { id: 3, codigo: '+16' },
                { id: 4, codigo: '+18' },
              ]),
          },
        },
        { provide: StorageService, useValue: { subirPortada, urlPublica: (ruta: string) => ruta } },
      ],
    });
  });
  it('bloquea datos incompletos y exige al menos un género', async () => {
    const fixture = TestBed.createComponent(FormularioPelicula);
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    });
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(guardar).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Elegí al menos un género');
    expect(fixture.nativeElement.textContent).toContain('Elegí una imagen de portada');
    expect(fixture.nativeElement.querySelector('input[type=date]')).toBeNull();
    const opciones = [...fixture.nativeElement.querySelectorAll('#clasificacion option')].map(
      (e: any) => e.textContent.trim(),
    );
    expect(opciones).toEqual(['Elegí una clasificación', 'ATP', '+13', '+16', '+18']);
  });
});

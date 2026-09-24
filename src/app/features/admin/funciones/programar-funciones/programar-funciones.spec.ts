import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { ProgramarFunciones } from './programar-funciones';
import { PeliculasService } from '../../../../core/data/peliculas-service';
import {
  ItemResumenProgramacion,
  ProgramacionService,
} from '../../../../core/data/programacion-service';
import type { PeliculaConCatalogo } from '../../../../core/models/pelicula';

describe('ProgramarFunciones (US-04.03, US-04.04, US-04.05)', () => {
  let fixture: ComponentFixture<ProgramarFunciones>;
  let component: ProgramarFunciones;

  let peliculasServiceMock: any;
  let programacionServiceMock: any;

  const peliculasMock: Partial<PeliculaConCatalogo>[] = [
    {
      id: 'dune-3',
      titulo: 'Dune: Parte Tres',
      duracion_min: 120,
      activo: true,
      estado: 'en_cartelera',
    },
  ];

  const formatosMock = [
    { id: 1, codigo: '2D', nombre: '2D' },
    { id: 2, codigo: '3D', nombre: '3D' },
  ];

  const versionesIdiomaMock = [
    { id: 1, codigo: 'castellano', nombre: 'Castellano' },
    { id: 2, codigo: 'subtitulada', nombre: 'Subtitulada' },
  ];

  beforeEach(async () => {
    peliculasServiceMock = {
      listar: vi.fn().mockResolvedValue(peliculasMock),
    };

    programacionServiceMock = {
      obtenerFormatos: vi.fn().mockResolvedValue(formatosMock),
      obtenerVersionesIdioma: vi.fn().mockResolvedValue(versionesIdiomaMock),
      calcularProgramacion: vi.fn(),
      crearFunciones: vi.fn().mockResolvedValue({ creadas: 3, fallidas: 0, errores: [] }),
    };

    await TestBed.configureTestingModule({
      imports: [ProgramarFunciones],
      providers: [
        provideRouter([]),
        { provide: PeliculasService, useValue: peliculasServiceMock },
        { provide: ProgramacionService, useValue: programacionServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgramarFunciones);
    component = fixture.componentInstance;
  });

  it('inicializa con datos de películas, formatos e idiomas', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.peliculas().length).toBe(1);
    expect(component.formatos().length).toBe(2);
    expect(component.versionesIdioma().length).toBe(2);
    expect(component.form.controls.pelicula_id.value).toBe('dune-3');
  });

  describe('AC-04.05.01: Formatos e idiomas admitidos', () => {
    it('muestra error si no se elige formato al intentar programar', async () => {
      await fixture.whenStable();
      component.formatoSeleccionado.set(null);
      fixture.detectChanges();

      await component.programar();
      fixture.detectChanges();

      expect(component.error()).toBe('Elegí un formato');
      expect(programacionServiceMock.crearFunciones).not.toHaveBeenCalled();
    });

    it('indica formato e idioma en el resumen de funciones', async () => {
      await fixture.whenStable();
      component.setFormato(2); // 3D
      component.setVersionIdioma(2); // Subtitulada
      fixture.detectChanges();

      expect(component.nombreFormato()).toBe('3D');
      expect(component.nombreIdioma()).toBe('Subtitulada');
    });
  });

  describe('AC-04.03.01: Una función por día y horario', () => {
    it('llama al servicio para calcular la programación con los días y horarios elegidos', async () => {
      await fixture.whenStable();
      component.diasSeleccionados.set([1, 2, 5]); // Lun, Mar, Vie
      component.fechaInicio.set('2026-10-05');
      component.semanasSeleccionadas.set(1);

      const resumenEsperado: ItemResumenProgramacion[] = [
        {
          ocurrencia: {
            fecha: '2026-10-05',
            hora: '18:00',
            fechaHora: new Date('2026-10-05T18:00:00'),
            diaSemana: 1,
            diaNombre: 'lunes',
          },
          sala: { id: 'sala-1', numero: 1, nombre: 'Sala 1', activa: true, creado_en: '', actualizado_en: '' },
          asignada: true,
        },
        {
          ocurrencia: {
            fecha: '2026-10-06',
            hora: '18:00',
            fechaHora: new Date('2026-10-06T18:00:00'),
            diaSemana: 2,
            diaNombre: 'martes',
          },
          sala: { id: 'sala-1', numero: 1, nombre: 'Sala 1', activa: true, creado_en: '', actualizado_en: '' },
          asignada: true,
        },
        {
          ocurrencia: {
            fecha: '2026-10-09',
            hora: '18:00',
            fechaHora: new Date('2026-10-09T18:00:00'),
            diaSemana: 5,
            diaNombre: 'viernes',
          },
          sala: { id: 'sala-1', numero: 1, nombre: 'Sala 1', activa: true, creado_en: '', actualizado_en: '' },
          asignada: true,
        },
      ];

      programacionServiceMock.calcularProgramacion.mockResolvedValue(resumenEsperado);

      await component.calcular();
      fixture.detectChanges();

      expect(programacionServiceMock.calcularProgramacion).toHaveBeenCalledWith(
        expect.objectContaining({
          diasSemana: [1, 2, 5],
          fechaInicio: '2026-10-05',
          semanas: 1,
        })
      );
      expect(component.resumen().length).toBe(3);
    });
  });

  describe('AC-04.03.03: Horario sin sala disponible', () => {
    it('muestra aviso de las funciones sin sala disponible y solo crea las asignadas', async () => {
      await fixture.whenStable();
      component.resumen.set([
        {
          ocurrencia: {
            fecha: '2026-10-05',
            hora: '18:00',
            fechaHora: new Date('2026-10-05T18:00:00'),
            diaSemana: 1,
            diaNombre: 'lunes',
          },
          sala: { id: 'sala-1', numero: 1, nombre: 'Sala 1', activa: true, creado_en: '', actualizado_en: '' },
          asignada: true,
        },
        {
          ocurrencia: {
            fecha: '2026-10-06',
            hora: '18:00',
            fechaHora: new Date('2026-10-06T18:00:00'),
            diaSemana: 2,
            diaNombre: 'martes',
          },
          sala: null,
          asignada: false,
          motivo: 'Sin sala disponible: martes 06/10 18:00',
        },
      ]);
      fixture.detectChanges();

      expect(component.funcionesRechazadas().length).toBe(1);
      expect(component.funcionesRechazadas()[0].motivo).toContain('Sin sala disponible: martes 06/10 18:00');

      await component.programar();
      expect(programacionServiceMock.crearFunciones).toHaveBeenCalled();
    });
  });
});

import {
  asignarSala,
  calcularOcurrencias,
  formatearDiaFechaHora,
  IntervaloHorario,
  salaLibre,
} from './asignacion-salas';
import type { Sala } from '../models/sala';

describe('asignacion-salas (US-04.03, US-04.04)', () => {
  const salasEjemplo: Sala[] = [
    {
      id: 'sala-1',
      numero: 1,
      nombre: 'Sala 1',
      activa: true,
      creado_en: '2026-09-01T00:00:00Z',
      actualizado_en: '2026-09-01T00:00:00Z',
    },
    {
      id: 'sala-2',
      numero: 2,
      nombre: 'Sala 2',
      activa: true,
      creado_en: '2026-09-01T00:00:00Z',
      actualizado_en: '2026-09-01T00:00:00Z',
    },
    {
      id: 'sala-3',
      numero: 3,
      nombre: 'Sala 3',
      activa: false, // inactiva
      creado_en: '2026-09-01T00:00:00Z',
      actualizado_en: '2026-09-01T00:00:00Z',
    },
  ];

  describe('AC-04.03.01: Una función por día y horario', () => {
    it('Lunes, martes y viernes a las 18:00 en 1 semana desde 05/10/2026 genera 3 funciones', () => {
      // 05/10/2026 es Lunes (1). Días elegidos: Lunes (1), Martes (2), Viernes (5)
      const ocurrencias = calcularOcurrencias('2026-10-05', 1, [1, 2, 5], ['18:00']);

      expect(ocurrencias.length).toBe(3);
      expect(ocurrencias.map((o) => `${o.fecha} ${o.hora}`)).toEqual([
        '2026-10-05 18:00',
        '2026-10-06 18:00',
        '2026-10-09 18:00',
      ]);
    });

    it('Sábado a las 16:00 y 21:00 en 2 semanas desde 05/10/2026 genera 4 funciones', () => {
      // Sábado es día 6
      const ocurrencias = calcularOcurrencias('2026-10-05', 2, [6], ['16:00', '21:00']);

      expect(ocurrencias.length).toBe(4);
      expect(ocurrencias.map((o) => `${o.fecha} ${o.hora}`)).toEqual([
        '2026-10-10 16:00',
        '2026-10-10 21:00',
        '2026-10-17 16:00',
        '2026-10-17 21:00',
      ]);
    });
  });

  describe('AC-04.03.02: Sala asignada automáticamente', () => {
    it('asigna a Sala 2 si Sala 1 está ocupada de 17:30 a 19:30 el 09/10 para las 18:00', () => {
      const funcionesExistentes: IntervaloHorario[] = [
        {
          sala_id: 'sala-1',
          comienza_en: '2026-10-09T17:30:00Z',
          termina_en: '2026-10-09T19:30:00Z',
        },
      ];

      const salaAsignada = asignarSala(
        salasEjemplo,
        funcionesExistentes,
        '2026-10-09T18:00:00Z',
        120
      );

      expect(salaAsignada).not.toBeNull();
      expect(salaAsignada?.id).toBe('sala-2');
      expect(salaAsignada?.numero).toBe(2);
    });

    it('asigna a Sala 1 si todas las salas están libres', () => {
      const funcionesExistentes: IntervaloHorario[] = [];

      const salaAsignada = asignarSala(
        salasEjemplo,
        funcionesExistentes,
        '2026-10-12T15:00:00Z',
        120
      );

      expect(salaAsignada).not.toBeNull();
      expect(salaAsignada?.id).toBe('sala-1');
      expect(salaAsignada?.numero).toBe(1);
    });

    it('ignora salas inactivas en la asignación', () => {
      const funcionesExistentes: IntervaloHorario[] = [
        {
          sala_id: 'sala-1',
          comienza_en: '2026-10-09T17:30:00Z',
          termina_en: '2026-10-09T19:30:00Z',
        },
        {
          sala_id: 'sala-2',
          comienza_en: '2026-10-09T17:30:00Z',
          termina_en: '2026-10-09T19:30:00Z',
        },
      ];

      // Sala 3 está libre pero inactiva
      const salaAsignada = asignarSala(
        salasEjemplo,
        funcionesExistentes,
        '2026-10-09T18:00:00Z',
        120
      );

      expect(salaAsignada).toBeNull();
    });
  });

  describe('AC-04.03.03: Horario sin sala disponible', () => {
    it('devuelve null y formatea mensaje cuando ninguna sala activa tiene disponibilidad', () => {
      const funcionesExistentes: IntervaloHorario[] = [
        {
          sala_id: 'sala-1',
          comienza_en: '2026-10-06T17:00:00Z',
          termina_en: '2026-10-06T21:00:00Z',
        },
        {
          sala_id: 'sala-2',
          comienza_en: '2026-10-06T17:00:00Z',
          termina_en: '2026-10-06T21:00:00Z',
        },
      ];

      const sala = asignarSala(
        salasEjemplo,
        funcionesExistentes,
        '2026-10-06T18:00:00Z',
        120
      );

      expect(sala).toBeNull();
      const aviso = `Sin sala disponible: ${formatearDiaFechaHora('2026-10-06', '18:00')}`;
      expect(aviso).toBe('Sin sala disponible: martes 06/10 18:00');
    });
  });

  describe('AC-04.04.01: Intervalo mínimo de 30 minutos', () => {
    it('inicio demasiado cercano: función previa termina a las 20:00, nueva a las 20:15 es rechazada', () => {
      const funcionesExistentes: IntervaloHorario[] = [
        {
          sala_id: 'sala-1',
          comienza_en: '2026-10-01T18:00:00Z',
          termina_en: '2026-10-01T20:00:00Z',
        },
      ];

      const libre = salaLibre(
        funcionesExistentes,
        '2026-10-01T20:15:00Z',
        120,
        30
      );

      expect(libre).toBe(false);
    });

    it('inicio en el límite: función previa termina a las 20:00, nueva a las 20:30 es admitida', () => {
      const funcionesExistentes: IntervaloHorario[] = [
        {
          sala_id: 'sala-1',
          comienza_en: '2026-10-01T18:00:00Z',
          termina_en: '2026-10-01T20:00:00Z',
        },
      ];

      const libre = salaLibre(
        funcionesExistentes,
        '2026-10-01T20:30:00Z',
        120,
        30
      );

      expect(libre).toBe(true);
    });

    it('fin demasiado cercano a la siguiente: siguiente a las 18:00, nueva de 16:00 a 17:40 es rechazada', () => {
      const funcionesExistentes: IntervaloHorario[] = [
        {
          sala_id: 'sala-1',
          comienza_en: '2026-10-01T18:00:00Z',
          termina_en: '2026-10-01T20:00:00Z',
        },
      ];

      const libre = salaLibre(
        funcionesExistentes,
        '2026-10-01T16:00:00Z',
        100, // 100 minutos -> termina 17:40
        30
      );

      expect(libre).toBe(false);
    });
  });

  describe('AC-04.04.02: Nunca dos funciones simultáneas', () => {
    it('función existente de 19:00 a 21:10 en Sala 2 rechaza función de 20:00 a 22:00', () => {
      const funcionesExistentes: IntervaloHorario[] = [
        {
          sala_id: 'sala-2',
          comienza_en: '2026-10-01T19:00:00Z',
          termina_en: '2026-10-01T21:10:00Z',
        },
      ];

      const libre = salaLibre(
        funcionesExistentes,
        '2026-10-01T20:00:00Z',
        120,
        30
      );

      expect(libre).toBe(false);
    });
  });
});

import {
  COLUMNAS_ACCESIBLES,
  esButacaValida,
  esPasillo,
  generarDistribucionSala,
  tipoDeButaca,
} from './distribucion';

describe('butacas (US-04.02)', () => {
  describe('AC-04.02.01: Disposición de 518 butacas', () => {
    it('cuenta con 420 butacas comunes, 84 VIP y 14 accesibles para un total de 518', () => {
      const layout = generarDistribucionSala();

      expect(layout.totalButacas).toBe(518);
      expect(layout.totalComunes).toBe(420);
      expect(layout.totalVip).toBe(84);
      expect(layout.totalAccesibles).toBe(14);
      expect(layout.butacas.length).toBe(518);
    });

    it('la fila común A tiene A1 a A4, A6 a A25 y A27 a A30, y no existen A5 ni A26', () => {
      const layout = generarDistribucionSala();
      const filaA = layout.filas.find((f) => f.letra === 'A');

      expect(filaA).toBeDefined();
      const butacasA = filaA!.posiciones.filter((b): b is NonNullable<typeof b> => b !== null);
      expect(butacasA.length).toBe(28);

      expect(esPasillo(5)).toBe(true);
      expect(esPasillo(26)).toBe(true);
      expect(esButacaValida('A', 5)).toBe(false);
      expect(esButacaValida('A', 26)).toBe(false);
      expect(butacasA.some((b) => b.id === 'A5')).toBe(false);
      expect(butacasA.some((b) => b.id === 'A26')).toBe(false);
      expect(butacasA.some((b) => b.id === 'A1')).toBe(true);
      expect(butacasA.some((b) => b.id === 'A4')).toBe(true);
      expect(butacasA.some((b) => b.id === 'A6')).toBe(true);
      expect(butacasA.some((b) => b.id === 'A25')).toBe(true);
      expect(butacasA.some((b) => b.id === 'A27')).toBe(true);
      expect(butacasA.some((b) => b.id === 'A30')).toBe(true);
    });

    it('la fila K se muestra como espacio libre de circulación sin butacas', () => {
      const layout = generarDistribucionSala();
      const filaK = layout.filas.find((f) => f.letra === 'K');

      expect(filaK).toBeDefined();
      expect(filaK!.esCirculacion).toBe(true);
      const butacasK = filaK!.posiciones.filter((b) => b !== null);
      expect(butacasK.length).toBe(0);
      expect(esButacaValida('K', 1)).toBe(false);
      expect(esButacaValida('K', 15)).toBe(false);
    });
  });

  describe('AC-04.02.02: Fila J accesible', () => {
    it('la fila J solo tiene J2, J3, J11 a J20, J28 y J29', () => {
      const layout = generarDistribucionSala();
      const filaJ = layout.filas.find((f) => f.letra === 'J');

      expect(filaJ).toBeDefined();
      expect(filaJ!.esAccesible).toBe(true);
      const butacasJ = filaJ!.posiciones.filter((b): b is NonNullable<typeof b> => b !== null);
      expect(butacasJ.length).toBe(14);

      const esperadas = COLUMNAS_ACCESIBLES.map((c) => `J${c}`);
      const obtenidas = butacasJ.map((b) => b.id);
      expect(obtenidas).toEqual(esperadas);

      // Posiciones que deben estar vacías en fila J
      expect(filaJ!.posiciones[0]).toBeNull(); // J1
      expect(filaJ!.posiciones[3]).toBeNull(); // J4
      expect(filaJ!.posiciones[5]).toBeNull(); // J6
      expect(filaJ!.posiciones[9]).toBeNull(); // J10
      expect(filaJ!.posiciones[20]).toBeNull(); // J21
      expect(filaJ!.posiciones[26]).toBeNull(); // J27
      expect(filaJ!.posiciones[29]).toBeNull(); // J30
    });
  });

  describe('AC-04.02.03: Tipos de butaca diferenciados', () => {
    it('las filas R, S y T son tipo VIP', () => {
      expect(tipoDeButaca('R')).toBe('vip');
      expect(tipoDeButaca('S')).toBe('vip');
      expect(tipoDeButaca('T')).toBe('vip');

      const layout = generarDistribucionSala();
      const vipSeats = layout.butacas.filter((b) => b.tipo === 'vip');
      expect(vipSeats.length).toBe(84);
      expect(vipSeats.every((b) => ['R', 'S', 'T'].includes(b.fila))).toBe(true);
    });

    it('la fila J es tipo accesible', () => {
      expect(tipoDeButaca('J')).toBe('accesible');

      const layout = generarDistribucionSala();
      const wcSeats = layout.butacas.filter((b) => b.tipo === 'accesible');
      expect(wcSeats.length).toBe(14);
      expect(wcSeats.every((b) => b.fila === 'J')).toBe(true);
    });

    it('las demás filas son de tipo común', () => {
      expect(tipoDeButaca('A')).toBe('comun');
      expect(tipoDeButaca('H')).toBe('comun');
      expect(tipoDeButaca('Q')).toBe('comun');
    });

    it('marca butacas ocupadas y bloqueadas correctamente', () => {
      const layout = generarDistribucionSala(['H11', 'H12'], ['A1']);
      const h11 = layout.butacas.find((b) => b.id === 'H11');
      const a1 = layout.butacas.find((b) => b.id === 'A1');
      const h13 = layout.butacas.find((b) => b.id === 'H13');

      expect(h11?.estado).toBe('ocupada');
      expect(a1?.estado).toBe('bloqueada');
      expect(h13?.estado).toBe('disponible');
    });
  });
});

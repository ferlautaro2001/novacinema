import {
  diasConsecutivos,
  etiquetaDia,
  fechaLarga,
  leerDDMMAAAA,
  mesesDe,
  mismoDia,
  sumarDias,
} from './fechas';

describe('fechas', () => {
  const lunes5 = new Date(2026, 9, 5);

  it('genera días consecutivos desde una fecha, a medianoche', () => {
    const dias = diasConsecutivos(new Date(2026, 9, 5, 18, 40), 7);
    expect(dias).toHaveLength(7);
    expect(dias[0]).toEqual(new Date(2026, 9, 5));
    expect(dias[6]).toEqual(new Date(2026, 9, 11));
  });

  it('cruza de mes y de año', () => {
    expect(sumarDias(new Date(2026, 11, 30), 3)).toEqual(new Date(2027, 0, 2));
  });

  it('nombra los días como el selector', () => {
    const etiquetas = diasConsecutivos(lunes5, 7).map((d) => etiquetaDia(d, lunes5));
    expect(etiquetas).toEqual(['Hoy', 'Mañana', 'Mié 7', 'Jue 8', 'Vie 9', 'Sáb 10', 'Dom 11']);
    expect(etiquetaDia(new Date(2026, 9, 12), lunes5)).toBe('Lun 12');
  });

  it('describe la fecha y los meses en palabras', () => {
    expect(fechaLarga(new Date(2026, 9, 7))).toBe('miércoles 7 de octubre');
    expect(mesesDe(diasConsecutivos(lunes5, 7))).toBe('octubre de 2026');
    expect(mesesDe(diasConsecutivos(new Date(2026, 9, 29), 7))).toBe('octubre y noviembre de 2026');
    expect(mesesDe(diasConsecutivos(new Date(2026, 11, 29), 7))).toBe(
      'diciembre de 2026 y enero de 2027',
    );
  });

  it('compara días sin mirar la hora', () => {
    expect(mismoDia(new Date(2026, 9, 5, 0, 1), new Date(2026, 9, 5, 23, 59))).toBe(true);
    expect(mismoDia(new Date(2026, 9, 5), new Date(2026, 9, 6))).toBe(false);
  });

  it('lee DD/MM/AAAA solo si la fecha existe', () => {
    expect(leerDDMMAAAA('14/02/1990')).toEqual(new Date(1990, 1, 14));
    expect(leerDDMMAAAA('29/02/2024')).toEqual(new Date(2024, 1, 29));
    expect(leerDDMMAAAA('31/02/2000')).toBeNull();
    expect(leerDDMMAAAA('29/02/2023')).toBeNull();
    expect(leerDDMMAAAA('1/2/1990')).toBeNull();
    expect(leerDDMMAAAA('1990-02-14')).toBeNull();
  });
});

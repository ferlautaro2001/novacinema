import { FormControl, FormGroup } from '@angular/forms';
import { fechaPorPartes, isoDePartes } from './fecha-por-partes';

describe('fechaPorPartes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 10, 30));
  });

  afterEach(() => vi.useRealTimers());

  const validar = (dia: string, mes: string, anio: string, soloAnteriorAHoy = true) =>
    fechaPorPartes({ soloAnteriorAHoy })(
      new FormGroup({
        dia: new FormControl(dia),
        mes: new FormControl(mes),
        anio: new FormControl(anio),
      }),
    );

  it('acepta una fecha real, con o sin el 0 del día', () => {
    expect(validar('14', '02', '1990')).toBeNull();
    expect(validar('1', '02', '1990')).toBeNull();
    expect(validar('01', '02', '1990')).toBeNull();
  });

  it('pide las tres partes', () => {
    expect(validar('', '02', '1990')).toEqual({ fechaIncompleta: true });
    expect(validar('14', '', '1990')).toEqual({ fechaIncompleta: true });
    expect(validar('14', '02', '')).toEqual({ fechaIncompleta: true });
  });

  it('rechaza el día 0 y los mayores a 31', () => {
    expect(validar('0', '02', '1990')).toEqual({ diaInvalido: true });
    expect(validar('00', '02', '1990')).toEqual({ diaInvalido: true });
    expect(validar('32', '01', '1990')).toEqual({ diaInvalido: true });
  });

  it('limita el año entre 1909 y el año en curso', () => {
    const fuera = { anioFueraDeRango: { minimo: 1909, maximo: 2026 } };
    expect(validar('14', '02', '1908')).toEqual(fuera);
    expect(validar('14', '02', '2027')).toEqual(fuera);
    expect(validar('14', '02', '199')).toEqual(fuera);
    expect(validar('01', '01', '1909')).toBeNull();
  });

  it('rechaza combinaciones que no existen', () => {
    expect(validar('31', '02', '2000')).toEqual({ fechaInvalida: true });
    expect(validar('29', '02', '2023')).toEqual({ fechaInvalida: true });
    expect(validar('29', '02', '2024')).toBeNull();
  });

  it('con soloAnteriorAHoy rechaza hoy y fechas futuras', () => {
    expect(validar('10', '10', '2026')).toEqual({ fechaNoAnterior: true });
    expect(validar('05', '10', '2026')).toEqual({ fechaNoAnterior: true });
    expect(validar('04', '10', '2026')).toBeNull();
    expect(validar('10', '10', '2026', false)).toBeNull();
  });

  it('arma la fecha ISO completando el 0 del día', () => {
    expect(isoDePartes({ dia: '4', mes: '02', anio: '1990' })).toBe('1990-02-04');
    expect(isoDePartes({ dia: '14', mes: '11', anio: '1985' })).toBe('1985-11-14');
  });
});

import { FormControl } from '@angular/forms';
import { alMenosUno, textoRequerido } from './al-menos-uno';
import { TextoLargoPipe } from '../pipes/texto-largo-pipe';
import { DuracionPipe } from '../pipes/duracion-pipe';

describe('Reglas de presentación del catálogo', () => {
  it('requiere un género y texto con contenido', () => {
    expect(alMenosUno(new FormControl([false, false]))).toEqual({ alMenosUno: true });
    expect(alMenosUno(new FormControl([false, true]))).toBeNull();
    expect(textoRequerido(new FormControl('   '))).toEqual({ required: true });
  });
  it('acorta incluyendo la elipsis dentro del límite', () => {
    expect(new TextoLargoPipe().transform('a'.repeat(81), 80)).toBe('a'.repeat(79) + '…');
    expect(new TextoLargoPipe().transform('a'.repeat(80), 80)).toHaveLength(80);
    expect(new DuracionPipe().transform(165)).toBe('2 h 45 min');
    expect(new DuracionPipe().transform(60)).toBe('1 h');
    expect(new DuracionPipe().transform(45)).toBe('45 min');
  });
});

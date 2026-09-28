import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';
import type { EstadoFuncion } from './enumerados';

export type Funcion = Omit<Tables<'funciones'>, 'estado'> & { estado: EstadoFuncion };
export type FuncionPorCrear = TablesInsert<'funciones'>;
export type FuncionPorModificar = TablesUpdate<'funciones'>;

// Ojo: en las vistas todas las columnas vienen como nullable, hay que chequearlas
// donde se usen.
export type FuncionDisponibilidad = Tables<'v_funcion_disponibilidad'>;

// Una función tal como la elige el cliente en el primer paso de la compra
// (US-07.01). Sale de v_funciones_para_comprar, que ya trae el nombre de la sala,
// el formato, el idioma y las butacas que quedan.
export interface FuncionParaComprar {
  id: string;
  peliculaId: string;
  peliculaTitulo: string;
  sala: string;
  comienzaEn: Date;
  formato: string;
  idioma: string;
  totalButacas: number;
  butacasLibres: number;
  // Sin butacas libres: se muestra igual, marcada como Agotada (AC-07.01.02).
  agotada: boolean;
  enPreventa: boolean;
}

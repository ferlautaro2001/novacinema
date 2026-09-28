import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';
import type { CanalCompra, EstadoCompra } from './enumerados';

export type Compra = Omit<Tables<'compras'>, 'estado' | 'canal'> & {
  estado: EstadoCompra;
  canal: CanalCompra;
};
export type CompraPorCrear = TablesInsert<'compras'>;
export type CompraPorModificar = TablesUpdate<'compras'>;

export type Entrada = Tables<'entradas'>;
export type EntradaPorCrear = TablesInsert<'entradas'>;
export type EntradaPorModificar = TablesUpdate<'entradas'>;

export type Pago = Tables<'pagos'>;
export type PagoPorCrear = TablesInsert<'pagos'>;

export type CompraCupon = Tables<'compra_cupones'>;
export type CompraCuponPorCrear = TablesInsert<'compra_cupones'>;

// Al que compra sin registrarse le pido los datos igual para validar la edad.
export type CompradorInvitado = Tables<'compradores_invitados'>;
export type CompradorInvitadoPorCrear = TablesInsert<'compradores_invitados'>;

// Adulto que se hace cargo de un menor en una función con restricción de edad.
export type AdultoResponsable = Tables<'compras_adulto_responsable'>;
export type AdultoResponsablePorCrear = TablesInsert<'compras_adulto_responsable'>;

export type MovimientoCredito = Tables<'movimientos_credito'>;
export type MovimientoCreditoPorCrear = TablesInsert<'movimientos_credito'>;

export type CompraTotal = Tables<'v_compra_total'>;
export type SaldoCredito = Tables<'v_saldo_credito'>;

// Todo lo que va en el comprobante de una compra (US-07.08), leído de la base:
// sirve igual para la confirmación de la compra y para el pedido del Candy que
// se suma después (AC-08.06.02).
export interface ComprobanteCompra {
  codigo: string;
  pelicula: string;
  clasificacion: string;
  comienzaEn: Date;
  sala: string;
  formato: string;
  idioma: string;
  butacas: string;
  titular: string;
  total: number;
  // "2 × Coca-Cola", o vacío si la compra no tiene pedido.
  candy: string[];
}

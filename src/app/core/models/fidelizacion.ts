import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type Recompensa = Tables<'recompensas'>;
export type RecompensaPorCrear = TablesInsert<'recompensas'>;
export type RecompensaPorModificar = TablesUpdate<'recompensas'>;

export type RecompensaItem = Tables<'recompensa_items'>;
export type RecompensaItemPorCrear = TablesInsert<'recompensa_items'>;

// El canje no lo inserto desde la app: canjear_recompensa descuenta los puntos y
// crea la compra en una sola transacción, así no se gastan dos veces los mismos puntos.
export type Canje = Tables<'canjes'>;

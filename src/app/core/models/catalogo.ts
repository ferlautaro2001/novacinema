// Tablas de referencia: las carga la migración y desde la app solo las leo. Los
// tipos salen de database.types.ts, que genero con el CLI de Supabase.

import type { Tables } from '../supabase/database.types';

export type Genero = Tables<'generos'>;
export type Clasificacion = Tables<'clasificaciones'>;
export type Formato = Tables<'formatos'>;
export type VersionIdioma = Tables<'versiones_idioma'>;
export type TipoButaca = Tables<'tipos_butaca'>;
export type MedioPago = Tables<'medios_pago'>;
export type CategoriaProducto = Tables<'categorias_producto'>;

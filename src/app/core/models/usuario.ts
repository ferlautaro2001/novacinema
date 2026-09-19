import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type Usuario = Tables<'usuarios'>;
export type UsuarioPorCrear = TablesInsert<'usuarios'>;
export type UsuarioPorModificar = TablesUpdate<'usuarios'>;

export type Rol = Tables<'roles'>;

/** Uso esta vista cuando muestro el autor de una reseña: es lo único que dejo
    ver de un perfil ajeno. */
export type PerfilPublico = Tables<'v_perfiles_publicos'>;

import type { Tables, TablesInsert, TablesUpdate } from '../supabase/database.types';

export type Usuario = Tables<'usuarios'>;
export type UsuarioPorCrear = TablesInsert<'usuarios'>;
export type UsuarioPorModificar = TablesUpdate<'usuarios'>;

// Lo único que se puede ver de un perfil ajeno, por ejemplo el autor de una reseña.
export type PerfilPublico = Tables<'v_perfiles_publicos'>;

import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import type { Database } from './database.types';

// Le paso el genérico <Database> al cliente porque me ahorra andar casteando con
// "as" en cada consulta. Además me avisa en tiempo de compilación si escribo mal
// el nombre de una tabla o de una columna, cosa que sin el genérico recién me
// enteraría en el navegador.
@Service()
export class Supabase {
  private sup: SupabaseClient<Database>;

  constructor() {
    this.sup = createClient<Database>(environment.SUPABASE_URL, environment.SUPABASE_KEY);
  }

  public get Sup() {
    return this.sup;
  }
}

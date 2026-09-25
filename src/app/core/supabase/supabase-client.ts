import { Service } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import type { Database } from './database.types';

// Le paso <Database> para que el compilador me avise si escribo mal una tabla o una
// columna, y no tener que castear con "as" en cada consulta.
@Service()
export class Supabase {
  private sup: SupabaseClient<Database>;

  constructor() {
    this.sup = createClient<Database>(environment.SUPABASE_URL, environment.SUPABASE_KEY);
  }

  get Sup() {
    const cliente = this.sup;

    return cliente;
  }
}

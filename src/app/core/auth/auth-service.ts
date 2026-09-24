import { inject, Service, signal } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { Supabase } from '../supabase/supabase-client';

// Estado de la sesión para toda la app. Me suscribo a onAuthStateChange apenas se
// crea el servicio: el primer evento (INITIAL_SESSION) llega cuando Supabase
// terminó de leer la sesión guardada, y recién ahí sé si hay alguien logueado.
// Mientras tanto `cargando` queda en true y el componente raíz muestra la
// pantalla de carga en vez de una sección que quizás no corresponde.
@Service()
export class AuthService {
  private readonly supS = inject(Supabase);

  private readonly _cargando = signal(true);
  private readonly _usuario = signal<User | null>(null);

  readonly cargando = this._cargando.asReadonly();
  readonly usuario = this._usuario.asReadonly();

  constructor() {
    this.supS.Sup.auth.onAuthStateChange((_evento, sesion) => {
      this._usuario.set(sesion?.user ?? null);
      this._cargando.set(false);
    });
  }
}

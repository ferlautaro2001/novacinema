import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';
import { environment } from '../../../environments/environment';

export const TIPOS_PORTADA = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PORTADA = 10 * 1024 * 1024;

export function validarPortada(archivo: File): string | null {
  if (!TIPOS_PORTADA.includes(archivo.type)) return 'Elegí una imagen JPEG, PNG o WebP.';
  if (!archivo.size || archivo.size > MAX_PORTADA)
    return 'La imagen debe pesar entre 1 byte y 10 MB.';
  return null;
}

@Service()
export class StorageService {
  private readonly sup = inject(Supabase).Sup;

  urlPublica(ruta: string): string {
    // Las portadas importadas pueden ser URLs externas; las nuevas guardan su ruta.
    if (/^https:\/\//.test(ruta)) return ruta;
    return `${environment.SUPABASE_URL}/storage/v1/object/public/imagenes/${ruta.split('/').map(encodeURIComponent).join('/')}`;
  }

}

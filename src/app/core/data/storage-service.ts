import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';

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
  private sup = inject(Supabase).Sup;

  urlPublica(ruta: string): string {
    // Las portadas importadas pueden ser URLs externas; las nuevas guardan su ruta.
    if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
      return ruta;
    }
    return this.sup.storage.from('imagenes').getPublicUrl(ruta).data.publicUrl;
  }

  async subirPortada(archivo: File): Promise<string> {
    const invalida = validarPortada(archivo);
    if (invalida) throw new Error(invalida);
    const extension = archivo.type === 'image/jpeg' ? 'jpg' : archivo.type.split('/')[1];
    const ruta = `peliculas/${crypto.randomUUID()}.${extension}`;
    const { error } = await this.sup.storage
      .from('imagenes')
      .upload(ruta, archivo, { upsert: false });
    if (error) throw new Error('No se pudo subir la portada. Probá de nuevo.');
    return ruta;
  }

  async eliminarPortada(ruta: string): Promise<void> {
    if (!ruta.startsWith('peliculas/')) return;
    const { error } = await this.sup.storage.from('imagenes').remove([ruta]);
    if (error) throw error;
  }
}

import { inject, Service } from '@angular/core';
import { Supabase } from '../supabase/supabase-client';

export const TIPOS_PORTADA = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PORTADA = 10 * 1024 * 1024;

export function validarPortada(archivo: File): string | null {
  let mensaje: string | null = null;

  if (TIPOS_PORTADA.includes(archivo.type) === false) {
    mensaje = 'Elegí una imagen JPEG, PNG o WebP.';
  } else if (archivo.size === 0 || archivo.size > MAX_PORTADA) {
    mensaje = 'La imagen debe pesar entre 1 byte y 10 MB.';
  }

  return mensaje;
}

@Service()
export class StorageService {
  private supS = inject(Supabase);

  urlPublica(ruta: string): string {
    // Las portadas importadas pueden ser URLs externas; las nuevas guardan su ruta.
    let esExterna = false;

    if (ruta.startsWith('http://')) {
      esExterna = true;
    } else if (ruta.startsWith('https://')) {
      esExterna = true;
    }

    let url = ruta;

    if (esExterna === false) {
      const respuesta = this.supS.Sup.storage.from('imagenes').getPublicUrl(ruta);
      url = respuesta.data.publicUrl;
    }

    return url;
  }

  // Sube el archivo al bucket "imagenes" y devuelve la ruta, no la URL: la URL
  // pública la arma urlPublica() en el momento de mostrarla.
  async subirPortada(archivo: File): Promise<string> {
    const invalida = validarPortada(archivo);

    if (invalida !== null) {
      throw new Error(invalida);
    }

    let extension = archivo.type.split('/')[1];

    if (extension === 'jpeg') {
      extension = 'jpg';
    }

    const nombreArchivo = crypto.randomUUID();
    const ruta = `peliculas/${nombreArchivo}.${extension}`;
    // Storage: INSERT en el bucket "imagenes", clave peliculas/<uuid>.<ext>
    const { error } = await this.supS.Sup.storage
      .from('imagenes')
      .upload(ruta, archivo, { upsert: false });
    if (error !== null) {
      throw new Error('No se pudo subir la portada. Probá de nuevo.');
    }

    return ruta;
  }

  async eliminarPortada(ruta: string): Promise<void> {
    if (ruta.startsWith('peliculas/')) {
      // Storage: DELETE del bucket "imagenes". Las importadas de TMDB están fuera
      // del bucket, así que no se tocan.
      const { error } = await this.supS.Sup.storage.from('imagenes').remove([ruta]);
      if (error !== null) {
        throw error;
      }
    }
  }
}

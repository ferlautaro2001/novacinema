// Plantilla de los environments. Este es el unico que se versiona.
//
// Para levantar el proyecto: copia este archivo dos veces en esta misma carpeta,
// como environment.ts y environment.development.ts, y completa los valores con
// los de tu proyecto de Supabase (Project Settings > API). En el de desarrollo
// pone production: false.
//
// Los dos archivos reales estan en .gitignore: las credenciales no se suben.
//
// La clave que va aca es la publicable, la que el navegador puede ver. La
// service_role nunca entra en el frontend, porque saltea todas las politicas de
// seguridad de la base.

export const environment = {
  production: true,
  SUPABASE_URL: 'https://TU-PROYECTO.supabase.co',
  SUPABASE_KEY: 'sb_publishable_TU_CLAVE_PUBLICABLE',
};

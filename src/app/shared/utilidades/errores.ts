// Mensaje legible para un error de red o de la base. Si el error trae su propio
// mensaje se muestra ese; si no, el texto por defecto que pasa quien llama.
interface ErrorConMensaje {
  message?: string;
}

export function mensajeDeError(error: unknown, porDefecto: string): string {
  let mensaje = porDefecto;

  if (error !== null && error !== undefined) {
    const datos = error as ErrorConMensaje;

    if (datos.message !== undefined && datos.message !== null && datos.message !== '') {
      mensaje = datos.message;
    }
  }

  return mensaje;
}

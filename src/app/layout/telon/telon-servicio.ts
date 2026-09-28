import { Service, signal } from '@angular/core';

const CLAVE_SESION = 'novacinema:telon-visto';

// Milisegundos que dura la apertura: el telón tarda 1600 ms en desvanecerse,
// más sus 320 ms de desvanecimiento. Un poco de margen para no cortarlo.
const DURACION_APERTURA = 1980;

// El estado del telón de apertura: si está showing, si ya se abrió y cuándo se
// terminó de abrir. Vive en un servicio y no en el componente porque `App` también
// lo necesita: mientras el telón está arriba, el sitio va con `inert` para que no
// se pueda tabular hasta el contenido que todavía no se ve.
@Service()
export class TelonServicio {
  // Mientras sea true el telón tapa la pantalla y el sitio queda detrás.
  visible = signal(true);
  // Pasa a true al tocar la claqueta y dispara toda la apertura.
  abriendo = signal(false);

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (yaSeVisto()) {
      this.visible.set(false);
    }
  }

  // Un solo return: la guarda y el trabajo van juntos en el if.
  abrir(): void {
    const yaAbre = this.abriendo();

    if (yaAbre === false) {
      this.abriendo.set(true);
      // El bind no es opcional: sin él el temporizador llama al método suelto,
      // llega con this en undefined y revienta al tocar visible. Y es un bind y
      // no una flecha porque la guía pide funciones con nombre, no flechas sueltas.
      const alTerminar = this.alTerminarLaApertura.bind(this);

      this.temporizador = setTimeout(alTerminar, DURACION_APERTURA);
    }
  }

  // El recorrido ya terminó: saco el telón del medio y me acuerdo de que lo vi.
  private alTerminarLaApertura(): void {
    this.temporizador = null;
    this.visible.set(false);
    marcarVisto();
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// Si ya se mostró en esta sesión, no la volvemos a mostrar.
function yaSeVisto(): boolean {
  let visto = false;

  try {
    const guardado = sessionStorage.getItem(CLAVE_SESION);

    if (guardado !== null) {
      visto = true;
    }
  } catch {
    // Si el navegador no deja guardar, mostramos el telón igual: es una animación
    // y no puede ser la razón de que alguien no pueda entrar al sitio.
    visto = false;
  }

  return visto;
}

function marcarVisto(): void {
  try {
    sessionStorage.setItem(CLAVE_SESION, '1');
  } catch {
    // Sin memoria de la sesión el telón va a volver a aparecer al recargar.
    // No es grave: es lo mismo que pasa la primera vez.
  }
}

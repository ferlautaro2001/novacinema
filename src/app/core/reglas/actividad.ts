import type { Json } from '../supabase/database.types';
import type { AccionAuditoriaCodigo } from '../models/enumerados';

// El trigger guarda la fila ({ antes, despues }) con ids; acá la convierto en una
// línea que el administrador entiende: "Dune · Sala 2 · 09/10/2026 18:00".

const ETIQUETAS: Record<AccionAuditoriaCodigo, string> = {
  funcion_creada: 'Creó función',
  funcion_cancelada: 'Canceló función',
  precio_modificado: 'Modificó precio',
  qr_validado: 'Validó QR',
  candy_entregado: 'Entregó Candy',
  producto_creado: 'Creó producto',
  producto_editado: 'Editó producto',
  cambio_rol: 'Cambió rol',
  compra_cancelada: 'Canceló compra',
};

export function etiquetaAccion(codigo: AccionAuditoriaCodigo): string {
  return ETIQUETAS[codigo];
}

// Los nombres que no están en la fila auditada.
export interface NombresActividad {
  peliculas: Map<string, string>;
  salas: Map<string, string>;
  compras: Map<string, string>;
  productos: Map<string, string>;
  tiposButaca: Map<number, string>;
  formatos: Map<number, string>;
  roles: Map<number, string>;
}

export function nombresVacios(): NombresActividad {
  return {
    peliculas: new Map(),
    salas: new Map(),
    compras: new Map(),
    productos: new Map(),
    tiposButaca: new Map(),
    formatos: new Map(),
    roles: new Map(),
  };
}

type Fila = Record<string, Json | undefined>;

function esObjeto(valor: Json | undefined): boolean {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor);
}

// La fila después del cambio o, si fue un borrado, la de antes.
export function filaAuditada(detalle: Json | null): Fila {
  if (!esObjeto(detalle)) return {};
  const { antes, despues } = detalle as { antes?: Json; despues?: Json };
  const fila = despues ?? antes;
  if (!esObjeto(fila)) return {};
  return fila as Fila;
}

function filaAnterior(detalle: Json | null): Fila {
  if (!esObjeto(detalle)) return {};
  const antes = (detalle as { antes?: Json }).antes;
  if (!esObjeto(antes)) return {};
  return antes as Fila;
}

function texto(valor: Json | undefined): string {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

// Fechas en hora de Argentina, sin importar la zona de quien mira el panel.
const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function fechaHora(iso: string): string {
  const partes = Object.fromEntries(
    formatoFecha.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${partes['day']}/${partes['month']}/${partes['year']} ${partes['hour']}:${partes['minute']}`;
}

const formatoNumero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

function dinero(valor: Json | undefined): string {
  return `$ ${formatoNumero.format(Number(valor))}`;
}

// "$ 8.000 → $ 9.000", o solo el valor nuevo si es la primera vez que se carga.
function cambioDinero(antes: Json | undefined, despues: Json | undefined): string {
  if (antes === null || antes === undefined) return dinero(despues);
  return `${dinero(antes)} → ${dinero(despues)}`;
}

// "Común" queda "Tarifa común", pero "VIP" es una sigla y va en mayúsculas.
function etiquetaTarifa(nombre: string): string {
  if (nombre === 'VIP') return 'Tarifa VIP';
  return `Tarifa ${nombre.toLowerCase()}`.trim();
}

function puntos(valor: Json | undefined): string {
  return `${formatoNumero.format(Number(valor))} Nova Points`;
}

// Junta las partes no vacías con " · ".
function unir(...partes: string[]): string {
  return partes.filter((p) => p !== '').join(' · ');
}

export function detalleActividad(
  entidad: string,
  detalle: Json | null,
  nombres: NombresActividad,
): string {
  const f = filaAuditada(detalle);
  switch (entidad) {
    case 'funciones':
      return unir(
        nombres.peliculas.get(texto(f['pelicula_id'])) ?? '',
        nombres.salas.get(texto(f['sala_id'])) ?? '',
        f['comienza_en'] ? fechaHora(texto(f['comienza_en'])) : '',
      );
    case 'precios_butaca':
      return unir(
        etiquetaTarifa(nombres.tiposButaca.get(Number(f['tipo_butaca_id'])) ?? ''),
        cambioDinero(filaAnterior(detalle)['precio'], f['precio']),
      );
    case 'adicionales_formato':
      return unir(
        `Adicional ${nombres.formatos.get(Number(f['formato_id'])) ?? ''}`.trim(),
        cambioDinero(filaAnterior(detalle)['adicional'], f['adicional']),
      );
    case 'precios_producto':
      return unir(nombres.productos.get(texto(f['producto_id'])) ?? '', dinero(f['precio']));
    case 'preventas':
      return unir(
        `Preventa ${nombres.peliculas.get(texto(f['pelicula_id'])) ?? ''}`.trim(),
        `${texto(f['porcentaje'])} %`,
        f['habilitada'] === false ? 'deshabilitada' : '',
      );
    case 'cupones':
      return unir(
        `Cupón ${texto(f['codigo'])}`,
        `${texto(f['porcentaje'])} %`,
        f['activo'] === false ? 'desactivado' : '',
      );
    case 'recompensas':
      return unir(texto(f['nombre']), puntos(f['costo_puntos']));
    case 'productos':
      return texto(f['nombre']);
    case 'entradas':
    case 'pedidos_candy':
      return nombres.compras.get(texto(f['compra_id'])) ?? '';
    case 'compras':
      return texto(f['codigo']);
    case 'usuarios': {
      const antes = filaAnterior(detalle);
      const rolAntes = nombres.roles.get(Number(antes['rol_id'])) ?? '';
      const rolDespues = nombres.roles.get(Number(f['rol_id'])) ?? '';
      return unir(
        `${texto(f['nombre'])} ${texto(f['apellido'])}`.trim(),
        rolAntes && rolDespues ? `${rolAntes} → ${rolDespues}` : '',
      );
    }
    default:
      return '';
  }
}

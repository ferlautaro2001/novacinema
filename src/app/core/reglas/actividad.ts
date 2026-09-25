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
  const etiqueta = ETIQUETAS[codigo];

  return etiqueta;
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
  const nombres: NombresActividad = {
    peliculas: new Map(),
    salas: new Map(),
    compras: new Map(),
    productos: new Map(),
    tiposButaca: new Map(),
    formatos: new Map(),
    roles: new Map(),
  };

  return nombres;
}

type Fila = Record<string, Json | undefined>;

// La fila después del cambio o, si fue un borrado, la de antes.
export function filaAuditada(detalle: Json | null): Fila {
  let bandera: Fila = {};

  if (esObjeto(detalle)) {
    const datos = detalle as { antes?: Json; despues?: Json };

    let fila: Json | undefined;

    if (datos.despues !== null && datos.despues !== undefined) {
      fila = datos.despues;
    } else {
      fila = datos.antes;
    }

    if (esObjeto(fila)) {
      bandera = fila as Fila;
    }
  }

  return bandera;
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
  const partes = formatoFecha.formatToParts(new Date(iso));
  const valores: Record<string, string> = {};

  for (const parte of partes) {
    valores[parte.type] = parte.value;
  }

  const fechaFormateada = `${valores['day']}/${valores['month']}/${valores['year']} ${valores['hour']}:${valores['minute']}`;

  return fechaFormateada;
}

export function detalleActividad(
  entidad: string,
  detalle: Json | null,
  nombres: NombresActividad,
): string {
  const fila = filaAuditada(detalle);
  const filaAntes = filaAnterior(detalle);

  let resultado = '';

  switch (entidad) {
    case 'funciones':
      resultado = detalleFuncion(fila, nombres);
      break;

    case 'precios_butaca':
      resultado = detallePrecioButaca(fila, filaAntes, nombres);
      break;

    case 'adicionales_formato':
      resultado = detalleAdicionalFormato(fila, filaAntes, nombres);
      break;

    case 'precios_producto':
      resultado = detallePrecioProducto(fila, nombres);
      break;

    case 'preventas':
      resultado = detallePreventa(fila, nombres);
      break;

    case 'cupones':
      resultado = detalleCupon(fila);
      break;

    case 'recompensas':
      resultado = detalleRecompensa(fila);
      break;

    case 'productos':
      resultado = detalleProducto(fila);
      break;

    case 'entradas':
    case 'pedidos_candy':
      resultado = detalleCompraRelacionada(fila, nombres);
      break;

    case 'compras':
      resultado = detalleCompra(fila);
      break;

    case 'usuarios':
      resultado = detalleUsuario(fila, filaAntes, nombres);
      break;
  }

  return resultado;
}

// ─── Detalles por entidad ───────────────────────────────────────────

function detalleFuncion(fila: Fila, nombres: NombresActividad): string {
  const pelicula = buscarNombre(nombres.peliculas, texto(fila['pelicula_id']));
  const sala = buscarNombre(nombres.salas, texto(fila['sala_id']));
  const comienzaEn = texto(fila['comienza_en']);

  let fecha = '';

  if (comienzaEn !== '') {
    fecha = fechaHora(comienzaEn);
  }

  const detalle = unir(pelicula, sala, fecha);

  return detalle;
}

function detallePrecioButaca(fila: Fila, filaAntes: Fila, nombres: NombresActividad): string {
  const tipoButaca = buscarNombre(nombres.tiposButaca, Number(fila['tipo_butaca_id']));
  const tarifa = etiquetaTarifa(tipoButaca);
  const cambio = cambioDinero(filaAntes['precio'], fila['precio']);

  const detalle = unir(tarifa, cambio);

  return detalle;
}

function detalleAdicionalFormato(fila: Fila, filaAntes: Fila, nombres: NombresActividad): string {
  const formato = buscarNombre(nombres.formatos, Number(fila['formato_id']));
  const cambio = cambioDinero(filaAntes['adicional'], fila['adicional']);

  const detalle = unir(`Adicional ${formato}`.trim(), cambio);

  return detalle;
}

function detallePrecioProducto(fila: Fila, nombres: NombresActividad): string {
  const producto = buscarNombre(nombres.productos, texto(fila['producto_id']));
  const precio = dinero(fila['precio']);

  const detalle = unir(producto, precio);

  return detalle;
}

function detallePreventa(fila: Fila, nombres: NombresActividad): string {
  const pelicula = buscarNombre(nombres.peliculas, texto(fila['pelicula_id']));
  const porcentaje = `${texto(fila['porcentaje'])} %`;

  let estaDeshabilitada = false;

  if (fila['habilitada'] === false) {
    estaDeshabilitada = true;
  }

  const estado = estaDeshabilitada ? 'deshabilitada' : '';

  const detalle = unir(`Preventa ${pelicula}`.trim(), porcentaje, estado);

  return detalle;
}

function detalleCupon(fila: Fila): string {
  const codigo = texto(fila['codigo']);
  const porcentaje = `${texto(fila['porcentaje'])} %`;

  let estaDesactivado = false;

  if (fila['activo'] === false) {
    estaDesactivado = true;
  }

  const estado = estaDesactivado ? 'desactivado' : '';

  const detalle = unir(`Cupón ${codigo}`, porcentaje, estado);

  return detalle;
}

function detalleRecompensa(fila: Fila): string {
  const nombre = texto(fila['nombre']);
  const costo = puntos(fila['costo_puntos']);

  const detalle = unir(nombre, costo);

  return detalle;
}

function detalleProducto(fila: Fila): string {
  const nombre = texto(fila['nombre']);

  return nombre;
}

function detalleCompraRelacionada(fila: Fila, nombres: NombresActividad): string {
  const compra = buscarNombre(nombres.compras, texto(fila['compra_id']));

  return compra;
}

function detalleCompra(fila: Fila): string {
  const codigo = texto(fila['codigo']);

  return codigo;
}

function detalleUsuario(fila: Fila, filaAntes: Fila, nombres: NombresActividad): string {
  const nombreCompleto = `${texto(fila['nombre'])} ${texto(fila['apellido'])}`.trim();

  const rolAnterior = buscarNombre(nombres.roles, Number(filaAntes['rol_id']));
  const rolActual = buscarNombre(nombres.roles, Number(fila['rol_id']));

  let tieneRolAnterior = false;
  let tieneRolActual = false;

  if (rolAnterior !== '') {
    tieneRolAnterior = true;
  }

  if (rolActual !== '') {
    tieneRolActual = true;
  }

  let cambioRol = '';

  if (tieneRolAnterior && tieneRolActual) {
    cambioRol = `${rolAnterior} → ${rolActual}`;
  }

  const detalle = unir(nombreCompleto, cambioRol);

  return detalle;
}

// ─── Auxiliares ─────────────────────────────────────────────────────

function filaAnterior(detalle: Json | null): Fila {
  let bandera: Fila = {};

  if (esObjeto(detalle)) {
    const datos = detalle as { antes?: Json };
    const antes = datos.antes;

    if (esObjeto(antes)) {
      bandera = antes as Fila;
    }
  }

  return bandera;
}

function esObjeto(valor: Json | undefined): boolean {
  let bandera = true;

  if (valor === undefined || valor === null) {
    bandera = false;
  } else if (Array.isArray(valor)) {
    bandera = false;
  } else if (typeof valor !== 'object') {
    bandera = false;
  }

  return bandera;
}

// Busca un nombre por id; si no está cargado, devuelve texto vacío.
function buscarNombre<Clave>(mapa: Map<Clave, string>, clave: Clave): string {
  let nombre = '';

  const encontrado = mapa.get(clave);

  if (encontrado !== undefined) {
    nombre = encontrado;
  }

  return nombre;
}

function texto(valor: Json | undefined): string {
  let bandera = '';

  if (valor !== null && valor !== undefined) {
    bandera = String(valor);
  }

  return bandera;
}

const formatoNumero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

function dinero(valor: Json | undefined): string {
  const monto = `$ ${formatoNumero.format(Number(valor))}`;

  return monto;
}

// "$ 8.000 → $ 9.000", o solo el valor nuevo si es la primera vez que se carga.
function cambioDinero(antes: Json | undefined, despues: Json | undefined): string {
  let resultado: string;

  if (antes === null || antes === undefined) {
    resultado = dinero(despues);
  } else {
    resultado = `${dinero(antes)} → ${dinero(despues)}`;
  }

  return resultado;
}

// "Común" queda "Tarifa común", pero "VIP" es una sigla y va en mayúsculas.
function etiquetaTarifa(nombre: string): string {
  let etiqueta: string;

  if (nombre === 'VIP') {
    etiqueta = 'Tarifa VIP';
  } else {
    etiqueta = `Tarifa ${nombre.toLowerCase()}`.trim();
  }

  return etiqueta;
}

function puntos(valor: Json | undefined): string {
  const cantidad = `${formatoNumero.format(Number(valor))} Nova Points`;

  return cantidad;
}

function noEstaVacia(parte: string): boolean {
  let tieneTexto = false;

  if (parte !== '') {
    tieneTexto = true;
  }

  return tieneTexto;
}

// Junta las partes no vacías con " · ".
function unir(...partes: string[]): string {
  const resultado = partes.filter(noEstaVacia).join(' · ');

  return resultado;
}

// Valores cerrados del dominio. En la base son columnas de texto con CHECK (no enums
// de Postgres), así que los tipos generados los ven como string. Escribiéndolos como
// unión literal el compilador me frena si pongo 'pagado' donde va 'pagada'.
// Es lo único de models que mantengo a mano: si cambio el esquema, lo actualizo acá.

// Ojo que es 'administrador' y no 'admin'.
export type Rol = 'cliente' | 'empleado' | 'administrador';

export type ClasificacionCodigo = 'ATP' | '+13' | '+16' | '+18';

export type FormatoCodigo = '2D' | '3D' | '4D' | '5D';

export type VersionIdiomaCodigo = 'castellano' | 'subtitulada';

// La fila J es la accesible; R, S y T son VIP.
export type TipoButacaCodigo = 'comun' | 'vip' | 'accesible';

export type MedioPagoCodigo = 'tarjeta' | 'efectivo' | 'credito' | 'puntos';

export type EstadoPelicula = 'proximamente' | 'en_cartelera' | 'archivada';

export type EstadoFuncion = 'programada' | 'cancelada' | 'finalizada';

// Las transiciones válidas las controla un trigger.
export type EstadoCompra = 'pendiente' | 'pagada' | 'cancelada';

export type CanalCompra = 'web' | 'boleteria';

export type EstadoPedidoCandy = 'pendiente' | 'entregado' | 'cancelado';

export type EstadoCanje = 'pendiente' | 'usado' | 'vencido';

// Solo puede existir un cupón de primera compra.
export type TipoCupon = 'primera_compra' | 'edad_minima' | 'general';

export type TipoMovimientoCredito = 'acreditacion' | 'uso' | 'ajuste';

export type TipoRecompensa = 'simple' | 'combo';

export type ClaseRecompensaItem = 'entrada' | 'producto';

export type AccionAuditoriaCodigo =
  | 'funcion_creada'
  | 'funcion_cancelada'
  | 'compra_cancelada'
  | 'precio_modificado'
  | 'producto_creado'
  | 'producto_editado'
  | 'qr_validado'
  | 'candy_entregado'
  | 'cambio_rol';

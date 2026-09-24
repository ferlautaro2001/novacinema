/* Acá junto los valores cerrados del dominio. Los tipos generados los ven como
   `string` porque en la base son columnas de texto con CHECK, no enums de
   Postgres, así que escribiéndolos como unión literal consigo que el compilador
   me frene si pongo 'pagado' donde va 'pagada'.

   Cada lista la saqué del CHECK o de la tabla de referencia correspondiente. Es
   lo único de esta carpeta que mantengo a mano: si cambio el esquema, tengo que
   acordarme de tocar este archivo. */

/** `roles.codigo`. Ojo que es 'administrador' y no 'admin': me comí ese error
    una vez y no matcheaba nunca. */
export type Rol = 'cliente' | 'empleado' | 'administrador';

/** `clasificaciones.codigo`, las estándares argentinas. */
export type ClasificacionCodigo = 'ATP' | '+13' | '+16' | '+18';

/** `formatos.codigo`. */
export type FormatoCodigo = '2D' | '3D' | '4D' | '5D';

/** `versiones_idioma.codigo`. */
export type VersionIdiomaCodigo = 'castellano' | 'subtitulada';

/** `tipos_butaca.codigo`. La fila J es la accesible; R, S y T son VIP. */
export type TipoButacaCodigo = 'comun' | 'vip' | 'accesible';

/** `medios_pago.codigo`. */
export type MedioPagoCodigo = 'tarjeta' | 'efectivo' | 'credito' | 'puntos';

/** `peliculas.estado`. */
export type EstadoPelicula = 'proximamente' | 'en_cartelera' | 'archivada';

/** `funciones.estado`. */
export type EstadoFuncion = 'programada' | 'cancelada' | 'finalizada';

/** `compras.estado`. Las transiciones válidas las valida un trigger. */
export type EstadoCompra = 'pendiente' | 'pagada' | 'cancelada';

/** `compras.canal`. */
export type CanalCompra = 'web' | 'boleteria';

/** `pedidos_candy.estado`. */
export type EstadoPedidoCandy = 'pendiente' | 'entregado' | 'cancelado';

/** `canjes.estado`. */
export type EstadoCanje = 'pendiente' | 'usado' | 'vencido';

/** `cupones.tipo`. Solo puede existir un cupón de primera compra. */
export type TipoCupon = 'primera_compra' | 'edad_minima' | 'general';

/** `movimientos_credito.tipo`. */
export type TipoMovimientoCredito = 'acreditacion' | 'uso' | 'ajuste';

/** `recompensas.tipo`. */
export type TipoRecompensa = 'simple' | 'combo';

/** `recompensa_items.clase`. */
export type ClaseRecompensaItem = 'entrada' | 'producto';

/** `acciones_auditoria.codigo`. */
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

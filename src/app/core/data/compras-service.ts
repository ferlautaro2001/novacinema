import { inject, Service } from '@angular/core';
import type { ComprobanteCompra } from '../models/compra';
import { Supabase } from '../supabase/supabase-client';
import { FuncionesService } from './funciones-service';
import { butacasYaVendidas, esButacaYaVendida, mensajeNoDisponibles } from '../reglas/butacas';
import { generarCodigoCompra } from '../reglas/codigos';

// Los ids de medios_pago que usa la web: la política pagos_alta solo le deja
// al cliente tarjeta y crédito.
const MEDIO_TARJETA = 1;
const MEDIO_CREDITO = 3;

// El error de Postgres cuando un insert choca con un índice único.
const CODIGO_DUPLICADO = '23505';

// Intentos de código antes de rendirse. Un choque ya es rarísimo; tres
// seguidos no deberían pasar nunca.
const INTENTOS_CODIGO = 3;

// El adulto responsable tal como llega de la compra (US-07.03).
export interface AdultoDeLaCompra {
  nombre: string;
  apellido: string;
  documento: string;
  fechaNacimiento: string;
}

// Todo lo que hace falta para registrar una compra web.
export interface PedidoDeCompra {
  usuarioId: string;
  funcionId: string;
  // Los ids del mapa ("F10"), en el orden en que se eligieron.
  butacas: string[];
  adulto: AdultoDeLaCompra | null;
  cuponId: string | null;
  // El pedido del Candy que va con la compra (AC-08.05.01); vacío si no hay.
  candy: { productoId: string; cantidad: number }[];
  // Cuánto crédito quiere usar el cliente como máximo. Se usa lo que haga
  // falta hasta cubrir el total, nunca más.
  creditoDisponible: number;
}

// Cómo quedó pagada la compra, con los montos que calculó la base.
export interface CompraRegistrada {
  id: string;
  codigo: string;
  total: number;
  credito: number;
  tarjeta: number;
}

// Un rechazo que el cliente tiene que ver tal cual ("F11 ya no está
// disponible. Elegí otra butaca"). Los demás errores se muestran genéricos.
export class CompraRechazada extends Error {}

@Service()
export class ComprasService {
  private supS = inject(Supabase);
  private funcionesService = inject(FuncionesService);

  // Registra la compra paso a paso (US-07.07): la compra pendiente, sus
  // entradas, el adulto, el cupón, los pagos y por último el pase a pagada, que
  // es donde la base valida todo junto y acredita crédito y puntos.
  //
  // No es una sola transacción: si algo falla después de crear la compra, se
  // cancela, y al cancelarla la base anula sus entradas y libera las butacas.
  // El índice único de entradas es lo que impide vender una butaca dos veces.
  async registrar(pedido: PedidoDeCompra): Promise<CompraRegistrada> {
    const butacasPorMapa = await this.butacasDeLaSala(pedido.funcionId);
    const compra = await this.crearPendiente(pedido.usuarioId);

    let registrada: CompraRegistrada;

    try {
      await this.agregarEntradas(compra.id, pedido, butacasPorMapa);

      if (pedido.adulto !== null) {
        await this.agregarAdulto(compra.id, pedido.adulto);
      }

      // El pedido va antes que el cupón: calcular_descuento toma el Candy en el
      // bruto, así el descuento lo alcanza igual que en el resumen.
      if (pedido.candy.length !== 0) {
        await this.agregarCandy(compra.id, pedido.candy);
      }

      if (pedido.cuponId !== null) {
        await this.agregarCupon(compra.id, pedido.cuponId);
      }

      registrada = await this.pagar(compra, pedido.creditoDisponible);
    } catch (e) {
      await this.cancelarPendiente(compra.id);
      throw e;
    }

    return registrada;
  }

  // Los datos del comprobante de una compra propia (US-07.08), con el pedido del
  // Candy si lo tiene (AC-08.06.02). Se leen de la base y no de la pantalla, así
  // el PDF es el mismo recién comprado o después de sumar el Candy.
  async comprobante(compraId: string): Promise<ComprobanteCompra> {
    // SELECT c.codigo, u.nombre, u.apellido, ar.nombre, ar.apellido,
    //   e.anulada_en, f.letra, b.numero, fu.comienza_en, s.nombre, fm.codigo,
    //   vi.nombre, p.titulo, cl.codigo, pi.cantidad, pr.nombre
    //   FROM compras c JOIN usuarios u ... LEFT JOIN compras_adulto_responsable ar ...
    //   JOIN entradas e ... LEFT JOIN pedidos_candy pc ... WHERE c.id = compraId
    const { data, error } = await this.supS.Sup.from('compras')
      .select(
        `codigo,
        usuarios!compras_usuario_id_fkey(nombre, apellido),
        compras_adulto_responsable(nombre, apellido),
        entradas(anulada_en, butacas(numero, filas(letra)), funciones(comienza_en, salas(nombre), formatos(codigo), versiones_idioma(nombre), peliculas(titulo, clasificaciones(codigo)))),
        pedidos_candy(estado, pedido_items(cantidad, productos(nombre)))`,
      )
      .eq('id', compraId)
      .single();
    if (error !== null) {
      throw error;
    }

    const total = await this.totalDe(compraId);
    const fila = data as unknown as FilaComprobante;
    const comprobante = aComprobante(fila, total);

    return comprobante;
  }

  // Del id del mapa ("F10") al uuid de la butaca en la sala de la función.
  private async butacasDeLaSala(funcionId: string): Promise<Map<string, string>> {
    // SELECT sala_id FROM funciones WHERE id = funcionId
    const { data: funcion, error: errorFuncion } = await this.supS.Sup.from('funciones')
      .select('sala_id')
      .eq('id', funcionId)
      .single();
    if (errorFuncion !== null) {
      throw errorFuncion;
    }

    // SELECT b.id, b.numero, f.letra FROM butacas b
    //   JOIN filas f ON f.id = b.fila_id WHERE f.sala_id = funcion.sala_id
    const { data: butacas, error: errorButacas } = await this.supS.Sup.from('butacas')
      .select('id, numero, filas!inner(letra, sala_id)')
      .eq('filas.sala_id', funcion.sala_id);
    if (errorButacas !== null) {
      throw errorButacas;
    }

    const porMapa = new Map<string, string>();

    for (const butaca of butacas) {
      porMapa.set(`${butaca.filas.letra}${butaca.numero}`, butaca.id);
    }

    return porMapa;
  }

  private async crearPendiente(usuarioId: string): Promise<{ id: string; codigo: string }> {
    let creada: { id: string; codigo: string } | null = null;
    let intento = 0;

    while (creada === null && intento < INTENTOS_CODIGO) {
      intento++;

      const codigo = generarCodigoCompra();
      const libre = await this.codigoLibre(codigo);

      if (libre) {
        creada = await this.insertarCompra(usuarioId, codigo);
      }
    }

    if (creada === null) {
      throw new Error('No se pudo generar el código de la compra');
    }

    return creada;
  }

  // Verificación de unicidad antes de usar el código (US-07.08). La RLS de
  // compras solo deja ver las propias, así que esta consulta no ve los códigos
  // de otros clientes: la garantía de verdad es el índice único de compras.codigo,
  // y si choca, insertarCompra devuelve null y se prueba con otro.
  private async codigoLibre(codigo: string): Promise<boolean> {
    // SELECT id FROM compras WHERE codigo = codigo
    const { data, error } = await this.supS.Sup.from('compras')
      .select('id')
      .eq('codigo', codigo)
      .maybeSingle();
    if (error !== null) {
      throw error;
    }

    let libre = false;

    if (data === null) {
      libre = true;
    }

    return libre;
  }

  // Devuelve null si el código ya existía, para probar con otro.
  private async insertarCompra(
    usuarioId: string,
    codigo: string,
  ): Promise<{ id: string; codigo: string } | null> {
    // INSERT INTO compras (codigo, usuario_id, canal) VALUES (...) RETURNING id, codigo
    const { data, error } = await this.supS.Sup.from('compras')
      .insert({ codigo: codigo, usuario_id: usuarioId, canal: 'web' })
      .select('id, codigo')
      .single();

    let creada: { id: string; codigo: string } | null = null;

    if (error !== null) {
      if (error.code !== CODIGO_DUPLICADO) {
        throw error;
      }
    } else {
      creada = data;
    }

    return creada;
  }

  private async agregarEntradas(
    compraId: string,
    pedido: PedidoDeCompra,
    butacasPorMapa: Map<string, string>,
  ): Promise<void> {
    const filas: { compra_id: string; funcion_id: string; butaca_id: string; precio: number }[] =
      [];

    for (const id of pedido.butacas) {
      const butacaId = butacasPorMapa.get(id);

      if (butacaId === undefined) {
        throw new CompraRechazada(`La butaca ${id} no existe en esta sala`);
      }

      // El precio lo pone calcular_precio_entrada; el 0 es solo para el tipo.
      filas.push({
        compra_id: compraId,
        funcion_id: pedido.funcionId,
        butaca_id: butacaId,
        precio: 0,
      });
    }

    // INSERT INTO entradas (compra_id, funcion_id, butaca_id, precio) VALUES (...)
    const { error } = await this.supS.Sup.from('entradas').insert(filas);
    if (error !== null) {
      if (esButacaYaVendida(error)) {
        throw await this.rechazoPorButacas(pedido);
      }

      throw error;
    }
  }

  // Si una butaca se vendió en el último instante, el índice único rechaza el
  // insert entero (AC-07.05.03). Supabase no manda el detalle del índice, así
  // que para nombrarla se vuelven a leer las ocupadas: las de esta compra no
  // llegaron a guardarse, así que todas son de otros.
  private async rechazoPorButacas(pedido: PedidoDeCompra): Promise<CompraRechazada> {
    const ocupadas = await this.funcionesService.butacasOcupadas(pedido.funcionId);
    const vendidas = butacasYaVendidas(pedido.butacas, ocupadas);

    let mensaje = 'Una de tus butacas ya no está disponible. Elegí otra butaca';

    if (vendidas.length !== 0) {
      mensaje = mensajeNoDisponibles(vendidas);
    }

    const rechazo = new CompraRechazada(mensaje);

    return rechazo;
  }

  private async agregarAdulto(compraId: string, adulto: AdultoDeLaCompra): Promise<void> {
    // INSERT INTO compras_adulto_responsable (compra_id, nombre, apellido, documento, fecha_nacimiento)
    const { error } = await this.supS.Sup.from('compras_adulto_responsable').insert({
      compra_id: compraId,
      nombre: adulto.nombre,
      apellido: adulto.apellido,
      documento: adulto.documento,
      fecha_nacimiento: adulto.fechaNacimiento,
    });
    if (error !== null) {
      throw error;
    }
  }

  // El pedido del Candy vinculado a la compra (US-08.05). Los precios los pone
  // calcular_precio_item; se cobra junto con las entradas en pagar().
  private async agregarCandy(
    compraId: string,
    candy: { productoId: string; cantidad: number }[],
  ): Promise<void> {
    // INSERT INTO pedidos_candy (compra_id) VALUES (compraId) RETURNING id
    const { data, error } = await this.supS.Sup.from('pedidos_candy')
      .insert({ compra_id: compraId })
      .select('id')
      .single();
    if (error !== null) {
      throw error;
    }

    const items: {
      pedido_id: string;
      producto_id: string;
      cantidad: number;
      precio_unitario: number;
    }[] = [];

    for (const item of candy) {
      items.push({
        pedido_id: data.id,
        producto_id: item.productoId,
        cantidad: item.cantidad,
        precio_unitario: 0,
      });
    }

    // INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (...)
    const { error: errorItems } = await this.supS.Sup.from('pedido_items').insert(items);
    if (errorItems !== null) {
      throw errorItems;
    }
  }

  // El monto lo calcula calcular_descuento, que también vuelve a validar el
  // cupón. Si ya no vale, se avisa en vez de cobrar sin descuento.
  private async agregarCupon(compraId: string, cuponId: string): Promise<void> {
    // INSERT INTO compra_cupones (compra_id, cupon_id, monto) VALUES (...)
    const { error } = await this.supS.Sup.from('compra_cupones').insert({
      compra_id: compraId,
      cupon_id: cuponId,
      monto: 0,
    });
    if (error !== null) {
      throw new CompraRechazada(`El descuento ya no se puede aplicar: ${error.message}`);
    }
  }

  // Los pagos salen del total que calculó la base (entradas menos descuento):
  // validar_compra exige que coincidan al centavo. Primero el crédito, hasta
  // donde alcance; el resto con tarjeta.
  private async pagar(
    compra: { id: string; codigo: string },
    creditoDisponible: number,
  ): Promise<CompraRegistrada> {
    const total = await this.totalDe(compra.id);
    const partes = repartirPago(total, creditoDisponible);
    const pagos: { compra_id: string; medio_pago_id: number; monto: number }[] = [];

    if (partes.credito > 0) {
      pagos.push({ compra_id: compra.id, medio_pago_id: MEDIO_CREDITO, monto: partes.credito });
    }

    if (partes.tarjeta > 0) {
      pagos.push({ compra_id: compra.id, medio_pago_id: MEDIO_TARJETA, monto: partes.tarjeta });
    }

    // INSERT INTO pagos (compra_id, medio_pago_id, monto) VALUES (...)
    const { error: errorPagos } = await this.supS.Sup.from('pagos').insert(pagos);
    if (errorPagos !== null) {
      throw errorPagos;
    }

    // UPDATE compras SET estado = 'pagada' WHERE id = compra.id
    // Los triggers validan total, edad y crédito, registran el uso del crédito
    // en movimientos_credito y acreditan los puntos.
    const { error: errorEstado } = await this.supS.Sup.from('compras')
      .update({ estado: 'pagada' })
      .eq('id', compra.id);
    if (errorEstado !== null) {
      throw errorEstado;
    }

    const registrada: CompraRegistrada = {
      id: compra.id,
      codigo: compra.codigo,
      total,
      credito: partes.credito,
      tarjeta: partes.tarjeta,
    };

    return registrada;
  }

  private async totalDe(compraId: string): Promise<number> {
    // SELECT total FROM v_compra_total WHERE compra_id = compraId
    const { data, error } = await this.supS.Sup.from('v_compra_total')
      .select('total')
      .eq('compra_id', compraId)
      .single();
    if (error !== null) {
      throw error;
    }

    let total = 0;

    if (data.total !== null) {
      total = Number(data.total);
    }

    return total;
  }

  // Si esto también falla no hay nada más que hacer desde el navegador: la
  // compra queda pendiente y no se cobró nada.
  private async cancelarPendiente(compraId: string): Promise<void> {
    // UPDATE compras SET estado = 'cancelada' WHERE id = compraId
    await this.supS.Sup.from('compras').update({ estado: 'cancelada' }).eq('id', compraId);
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// La compra con todo lo embebido, tal como la devuelve PostgREST en comprobante().
interface FilaComprobante {
  codigo: string;
  usuarios: { nombre: string; apellido: string } | null;
  compras_adulto_responsable: { nombre: string; apellido: string } | null;
  entradas: {
    anulada_en: string | null;
    butacas: { numero: number; filas: { letra: string } };
    funciones: {
      comienza_en: string;
      salas: { nombre: string };
      formatos: { codigo: string };
      versiones_idioma: { nombre: string };
      peliculas: { titulo: string; clasificaciones: { codigo: string } };
    };
  }[];
  pedidos_candy: {
    estado: string;
    pedido_items: { cantidad: number; productos: { nombre: string } }[];
  } | null;
}

// Solo cuentan las entradas vivas; la función es la de la primera (una compra
// es de una sola función). El titular es el adulto responsable si lo hubo.
function aComprobante(fila: FilaComprobante, total: number): ComprobanteCompra {
  const vivas: FilaComprobante['entradas'] = [];

  for (const entrada of fila.entradas) {
    if (entrada.anulada_en === null) {
      vivas.push(entrada);
    }
  }

  if (vivas.length === 0) {
    throw new Error('La compra no tiene entradas vigentes');
  }

  const funcion = vivas[0].funciones;
  const butacas: string[] = [];

  for (const entrada of vivas) {
    butacas.push(`${entrada.butacas.filas.letra}${entrada.butacas.numero}`);
  }

  let titular = '';

  if (fila.compras_adulto_responsable !== null) {
    titular = `${fila.compras_adulto_responsable.nombre} ${fila.compras_adulto_responsable.apellido}`;
  } else if (fila.usuarios !== null) {
    titular = `${fila.usuarios.nombre} ${fila.usuarios.apellido}`;
  }

  const candy: string[] = [];

  if (fila.pedidos_candy !== null && fila.pedidos_candy.estado !== 'cancelado') {
    for (const item of fila.pedidos_candy.pedido_items) {
      candy.push(`${item.cantidad} × ${item.productos.nombre}`);
    }
  }

  const comprobante: ComprobanteCompra = {
    codigo: fila.codigo,
    pelicula: funcion.peliculas.titulo,
    clasificacion: funcion.peliculas.clasificaciones.codigo,
    comienzaEn: new Date(funcion.comienza_en),
    sala: funcion.salas.nombre,
    formato: funcion.formatos.codigo,
    idioma: funcion.versiones_idioma.nombre,
    butacas: butacas.join(', '),
    titular,
    total,
    candy,
  };

  return comprobante;
}

// El crédito cubre hasta el total; la tarjeta, lo que falta. Se trabaja en
// centavos para que la suma dé exacta.
function repartirPago(
  total: number,
  creditoDisponible: number,
): { credito: number; tarjeta: number } {
  const totalCentavos = Math.round(total * 100);
  const disponibleCentavos = Math.max(0, Math.round(creditoDisponible * 100));
  const creditoCentavos = Math.min(totalCentavos, disponibleCentavos);
  const tarjetaCentavos = totalCentavos - creditoCentavos;
  const partes = { credito: creditoCentavos / 100, tarjeta: tarjetaCentavos / 100 };

  return partes;
}

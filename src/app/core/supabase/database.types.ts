export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      acciones_auditoria: {
        Row: {
          codigo: string;
          creado_en: string;
          descripcion: string;
          id: number;
        };
        Insert: {
          codigo: string;
          creado_en?: string;
          descripcion: string;
          id?: number;
        };
        Update: {
          codigo?: string;
          creado_en?: string;
          descripcion?: string;
          id?: number;
        };
        Relationships: [];
      };
      actividad: {
        Row: {
          accion_id: number;
          creado_en: string;
          detalle: Json | null;
          entidad: string;
          entidad_id: string | null;
          id: string;
          usuario_id: string;
        };
        Insert: {
          accion_id: number;
          creado_en?: string;
          detalle?: Json | null;
          entidad: string;
          entidad_id?: string | null;
          id?: string;
          usuario_id: string;
        };
        Update: {
          accion_id?: number;
          creado_en?: string;
          detalle?: Json | null;
          entidad?: string;
          entidad_id?: string | null;
          id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'actividad_accion_id_fkey';
            columns: ['accion_id'];
            isOneToOne: false;
            referencedRelation: 'acciones_auditoria';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'actividad_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'actividad_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      adicionales_formato: {
        Row: {
          adicional: number;
          creado_en: string;
          formato_id: number;
          vigente_desde: string;
        };
        Insert: {
          adicional: number;
          creado_en?: string;
          formato_id: number;
          vigente_desde: string;
        };
        Update: {
          adicional?: number;
          creado_en?: string;
          formato_id?: number;
          vigente_desde?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'adicionales_formato_formato_id_fkey';
            columns: ['formato_id'];
            isOneToOne: false;
            referencedRelation: 'formatos';
            referencedColumns: ['id'];
          },
        ];
      };
      alertas_estreno: {
        Row: {
          creada_en: string;
          notificada_en: string | null;
          pelicula_id: string;
          usuario_id: string;
        };
        Insert: {
          creada_en?: string;
          notificada_en?: string | null;
          pelicula_id: string;
          usuario_id: string;
        };
        Update: {
          creada_en?: string;
          notificada_en?: string | null;
          pelicula_id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'alertas_estreno_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'peliculas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alertas_estreno_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'v_ranking_peliculas';
            referencedColumns: ['pelicula_id'];
          },
          {
            foreignKeyName: 'alertas_estreno_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'alertas_estreno_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      butacas: {
        Row: {
          columna: number | null;
          creado_en: string;
          fila_id: string;
          id: string;
          numero: number;
        };
        Insert: {
          columna?: number | null;
          creado_en?: string;
          fila_id: string;
          id?: string;
          numero: number;
        };
        Update: {
          columna?: number | null;
          creado_en?: string;
          fila_id?: string;
          id?: string;
          numero?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'butacas_fila_id_fkey';
            columns: ['fila_id'];
            isOneToOne: false;
            referencedRelation: 'filas';
            referencedColumns: ['id'];
          },
        ];
      };
      canjes: {
        Row: {
          compra_id: string | null;
          costo_puntos: number;
          creado_en: string;
          estado: string;
          id: string;
          recompensa_id: string;
          usuario_id: string;
        };
        Insert: {
          compra_id?: string | null;
          costo_puntos: number;
          creado_en?: string;
          estado?: string;
          id?: string;
          recompensa_id: string;
          usuario_id: string;
        };
        Update: {
          compra_id?: string | null;
          costo_puntos?: number;
          creado_en?: string;
          estado?: string;
          id?: string;
          recompensa_id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'canjes_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'compras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'canjes_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'v_compra_total';
            referencedColumns: ['compra_id'];
          },
          {
            foreignKeyName: 'canjes_recompensa_id_fkey';
            columns: ['recompensa_id'];
            isOneToOne: false;
            referencedRelation: 'recompensas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'canjes_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'canjes_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      categorias_producto: {
        Row: {
          creado_en: string;
          id: number;
          nombre: string;
          orden: number;
        };
        Insert: {
          creado_en?: string;
          id?: number;
          nombre: string;
          orden: number;
        };
        Update: {
          creado_en?: string;
          id?: number;
          nombre?: string;
          orden?: number;
        };
        Relationships: [];
      };
      clasificaciones: {
        Row: {
          admite_adulto_responsable: boolean;
          codigo: string;
          creado_en: string;
          edad_minima: number;
          id: number;
        };
        Insert: {
          admite_adulto_responsable: boolean;
          codigo: string;
          creado_en?: string;
          edad_minima: number;
          id: number;
        };
        Update: {
          admite_adulto_responsable?: boolean;
          codigo?: string;
          creado_en?: string;
          edad_minima?: number;
          id?: number;
        };
        Relationships: [];
      };
      compra_cupones: {
        Row: {
          compra_id: string;
          creado_en: string;
          cupon_id: string;
          monto: number;
        };
        Insert: {
          compra_id: string;
          creado_en?: string;
          cupon_id: string;
          monto: number;
        };
        Update: {
          compra_id?: string;
          creado_en?: string;
          cupon_id?: string;
          monto?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'compra_cupones_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'compras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compra_cupones_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'v_compra_total';
            referencedColumns: ['compra_id'];
          },
          {
            foreignKeyName: 'compra_cupones_cupon_id_fkey';
            columns: ['cupon_id'];
            isOneToOne: false;
            referencedRelation: 'cupones';
            referencedColumns: ['id'];
          },
        ];
      };
      compradores_invitados: {
        Row: {
          apellido: string;
          compra_id: string;
          creado_en: string;
          email: string;
          fecha_nacimiento: string;
          nombre: string;
        };
        Insert: {
          apellido: string;
          compra_id: string;
          creado_en?: string;
          email: string;
          fecha_nacimiento: string;
          nombre: string;
        };
        Update: {
          apellido?: string;
          compra_id?: string;
          creado_en?: string;
          email?: string;
          fecha_nacimiento?: string;
          nombre?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'compradores_invitados_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'compras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compradores_invitados_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'v_compra_total';
            referencedColumns: ['compra_id'];
          },
        ];
      };
      compras: {
        Row: {
          actualizado_en: string;
          canal: string;
          cancelada_en: string | null;
          codigo: string;
          creada_en: string;
          estado: string;
          id: string;
          usuario_id: string | null;
          vendedor_id: string | null;
        };
        Insert: {
          actualizado_en?: string;
          canal: string;
          cancelada_en?: string | null;
          codigo: string;
          creada_en?: string;
          estado?: string;
          id?: string;
          usuario_id?: string | null;
          vendedor_id?: string | null;
        };
        Update: {
          actualizado_en?: string;
          canal?: string;
          cancelada_en?: string | null;
          codigo?: string;
          creada_en?: string;
          estado?: string;
          id?: string;
          usuario_id?: string | null;
          vendedor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'compras_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compras_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compras_vendedor_id_fkey';
            columns: ['vendedor_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compras_vendedor_id_fkey';
            columns: ['vendedor_id'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      compras_adulto_responsable: {
        Row: {
          apellido: string;
          compra_id: string;
          creado_en: string;
          documento: string;
          email: string;
          fecha_nacimiento: string;
          nombre: string;
        };
        Insert: {
          apellido: string;
          compra_id: string;
          creado_en?: string;
          documento: string;
          email: string;
          fecha_nacimiento: string;
          nombre: string;
        };
        Update: {
          apellido?: string;
          compra_id?: string;
          creado_en?: string;
          documento?: string;
          email?: string;
          fecha_nacimiento?: string;
          nombre?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'compras_adulto_responsable_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'compras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compras_adulto_responsable_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'v_compra_total';
            referencedColumns: ['compra_id'];
          },
        ];
      };
      configuracion: {
        Row: {
          actualizado_en: string;
          actualizado_por: string | null;
          clave: string;
          creado_en: string;
          descripcion: string | null;
          valor: string;
        };
        Insert: {
          actualizado_en?: string;
          actualizado_por?: string | null;
          clave: string;
          creado_en?: string;
          descripcion?: string | null;
          valor: string;
        };
        Update: {
          actualizado_en?: string;
          actualizado_por?: string | null;
          clave?: string;
          creado_en?: string;
          descripcion?: string | null;
          valor?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'configuracion_actualizado_por_fkey';
            columns: ['actualizado_por'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'configuracion_actualizado_por_fkey';
            columns: ['actualizado_por'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      cupones: {
        Row: {
          activo: boolean;
          actualizado_en: string;
          codigo: string;
          creado_en: string;
          edad_minima: number | null;
          id: string;
          porcentaje: number;
          tipo: string;
          usos_maximos: number | null;
          vigente_desde: string;
          vigente_hasta: string | null;
        };
        Insert: {
          activo?: boolean;
          actualizado_en?: string;
          codigo: string;
          creado_en?: string;
          edad_minima?: number | null;
          id?: string;
          porcentaje: number;
          tipo: string;
          usos_maximos?: number | null;
          vigente_desde: string;
          vigente_hasta?: string | null;
        };
        Update: {
          activo?: boolean;
          actualizado_en?: string;
          codigo?: string;
          creado_en?: string;
          edad_minima?: number | null;
          id?: string;
          porcentaje?: number;
          tipo?: string;
          usos_maximos?: number | null;
          vigente_desde?: string;
          vigente_hasta?: string | null;
        };
        Relationships: [];
      };
      entradas: {
        Row: {
          anulada_en: string | null;
          butaca_id: string;
          compra_id: string;
          creado_en: string;
          es_preventa: boolean;
          funcion_id: string;
          id: string;
          precio: number;
          validada_en: string | null;
          validada_por: string | null;
        };
        Insert: {
          anulada_en?: string | null;
          butaca_id: string;
          compra_id: string;
          creado_en?: string;
          es_preventa?: boolean;
          funcion_id: string;
          id?: string;
          precio: number;
          validada_en?: string | null;
          validada_por?: string | null;
        };
        Update: {
          anulada_en?: string | null;
          butaca_id?: string;
          compra_id?: string;
          creado_en?: string;
          es_preventa?: boolean;
          funcion_id?: string;
          id?: string;
          precio?: number;
          validada_en?: string | null;
          validada_por?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'entradas_butaca_id_fkey';
            columns: ['butaca_id'];
            isOneToOne: false;
            referencedRelation: 'butacas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entradas_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: false;
            referencedRelation: 'compras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entradas_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: false;
            referencedRelation: 'v_compra_total';
            referencedColumns: ['compra_id'];
          },
          {
            foreignKeyName: 'entradas_funcion_id_fkey';
            columns: ['funcion_id'];
            isOneToOne: false;
            referencedRelation: 'funciones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entradas_funcion_id_fkey';
            columns: ['funcion_id'];
            isOneToOne: false;
            referencedRelation: 'v_funcion_disponibilidad';
            referencedColumns: ['funcion_id'];
          },
          {
            foreignKeyName: 'entradas_validada_por_fkey';
            columns: ['validada_por'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entradas_validada_por_fkey';
            columns: ['validada_por'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      filas: {
        Row: {
          creado_en: string;
          id: string;
          letra: string;
          orden: number;
          sala_id: string;
          tipo_butaca_id: number;
        };
        Insert: {
          creado_en?: string;
          id?: string;
          letra: string;
          orden: number;
          sala_id: string;
          tipo_butaca_id: number;
        };
        Update: {
          creado_en?: string;
          id?: string;
          letra?: string;
          orden?: number;
          sala_id?: string;
          tipo_butaca_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'filas_sala_id_fkey';
            columns: ['sala_id'];
            isOneToOne: false;
            referencedRelation: 'salas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'filas_tipo_butaca_id_fkey';
            columns: ['tipo_butaca_id'];
            isOneToOne: false;
            referencedRelation: 'tipos_butaca';
            referencedColumns: ['id'];
          },
        ];
      };
      formatos: {
        Row: {
          activo: boolean;
          codigo: string;
          creado_en: string;
          id: number;
          nombre: string;
        };
        Insert: {
          activo?: boolean;
          codigo: string;
          creado_en?: string;
          id: number;
          nombre: string;
        };
        Update: {
          activo?: boolean;
          codigo?: string;
          creado_en?: string;
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
      funciones: {
        Row: {
          actualizado_en: string;
          comienza_en: string;
          creada_en: string;
          duracion_min: number;
          estado: string;
          formato_id: number;
          id: string;
          libre_desde: string;
          pelicula_id: string;
          sala_id: string;
          termina_en: string;
          version_idioma_id: number;
        };
        Insert: {
          actualizado_en?: string;
          comienza_en: string;
          creada_en?: string;
          duracion_min: number;
          estado?: string;
          formato_id: number;
          id?: string;
          libre_desde?: string;
          pelicula_id: string;
          sala_id: string;
          termina_en?: string;
          version_idioma_id: number;
        };
        Update: {
          actualizado_en?: string;
          comienza_en?: string;
          creada_en?: string;
          duracion_min?: number;
          estado?: string;
          formato_id?: number;
          id?: string;
          libre_desde?: string;
          pelicula_id?: string;
          sala_id?: string;
          termina_en?: string;
          version_idioma_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'funciones_formato_id_fkey';
            columns: ['formato_id'];
            isOneToOne: false;
            referencedRelation: 'formatos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'funciones_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'peliculas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'funciones_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'v_ranking_peliculas';
            referencedColumns: ['pelicula_id'];
          },
          {
            foreignKeyName: 'funciones_sala_id_fkey';
            columns: ['sala_id'];
            isOneToOne: false;
            referencedRelation: 'salas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'funciones_version_idioma_id_fkey';
            columns: ['version_idioma_id'];
            isOneToOne: false;
            referencedRelation: 'versiones_idioma';
            referencedColumns: ['id'];
          },
        ];
      };
      generos: {
        Row: {
          activo: boolean;
          creado_en: string;
          id: number;
          nombre: string;
        };
        Insert: {
          activo?: boolean;
          creado_en?: string;
          id?: number;
          nombre: string;
        };
        Update: {
          activo?: boolean;
          creado_en?: string;
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
      medios_pago: {
        Row: {
          activo: boolean;
          codigo: string;
          creado_en: string;
          id: number;
          nombre: string;
        };
        Insert: {
          activo?: boolean;
          codigo: string;
          creado_en?: string;
          id: number;
          nombre: string;
        };
        Update: {
          activo?: boolean;
          codigo?: string;
          creado_en?: string;
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
      movimientos_credito: {
        Row: {
          compra_id: string | null;
          creado_en: string;
          id: string;
          monto: number;
          tipo: string;
          usuario_id: string;
        };
        Insert: {
          compra_id?: string | null;
          creado_en?: string;
          id?: string;
          monto: number;
          tipo: string;
          usuario_id: string;
        };
        Update: {
          compra_id?: string | null;
          creado_en?: string;
          id?: string;
          monto?: number;
          tipo?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'movimientos_credito_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: false;
            referencedRelation: 'compras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_credito_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: false;
            referencedRelation: 'v_compra_total';
            referencedColumns: ['compra_id'];
          },
          {
            foreignKeyName: 'movimientos_credito_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_credito_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      notificaciones: {
        Row: {
          creada_en: string;
          id: string;
          leida_en: string | null;
          mensaje: string;
          pelicula_id: string | null;
          tipo: string;
          titulo: string;
          usuario_id: string;
        };
        Insert: {
          creada_en?: string;
          id?: string;
          leida_en?: string | null;
          mensaje: string;
          pelicula_id?: string | null;
          tipo: string;
          titulo: string;
          usuario_id: string;
        };
        Update: {
          creada_en?: string;
          id?: string;
          leida_en?: string | null;
          mensaje?: string;
          pelicula_id?: string | null;
          tipo?: string;
          titulo?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notificaciones_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'peliculas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notificaciones_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'v_ranking_peliculas';
            referencedColumns: ['pelicula_id'];
          },
          {
            foreignKeyName: 'notificaciones_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notificaciones_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      pagos: {
        Row: {
          compra_id: string;
          creado_en: string;
          id: string;
          medio_pago_id: number;
          monto: number;
        };
        Insert: {
          compra_id: string;
          creado_en?: string;
          id?: string;
          medio_pago_id: number;
          monto: number;
        };
        Update: {
          compra_id?: string;
          creado_en?: string;
          id?: string;
          medio_pago_id?: number;
          monto?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'pagos_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: false;
            referencedRelation: 'compras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pagos_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: false;
            referencedRelation: 'v_compra_total';
            referencedColumns: ['compra_id'];
          },
          {
            foreignKeyName: 'pagos_medio_pago_id_fkey';
            columns: ['medio_pago_id'];
            isOneToOne: false;
            referencedRelation: 'medios_pago';
            referencedColumns: ['id'];
          },
        ];
      };
      pedido_items: {
        Row: {
          cantidad: number;
          creado_en: string;
          id: string;
          pedido_id: string;
          precio_unitario: number;
          producto_id: string;
        };
        Insert: {
          cantidad: number;
          creado_en?: string;
          id?: string;
          pedido_id: string;
          precio_unitario: number;
          producto_id: string;
        };
        Update: {
          cantidad?: number;
          creado_en?: string;
          id?: string;
          pedido_id?: string;
          precio_unitario?: number;
          producto_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pedido_items_pedido_id_fkey';
            columns: ['pedido_id'];
            isOneToOne: false;
            referencedRelation: 'pedidos_candy';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pedido_items_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'productos';
            referencedColumns: ['id'];
          },
        ];
      };
      pedidos_candy: {
        Row: {
          compra_id: string;
          creado_en: string;
          entregado_en: string | null;
          entregado_por: string | null;
          estado: string;
          id: string;
        };
        Insert: {
          compra_id: string;
          creado_en?: string;
          entregado_en?: string | null;
          entregado_por?: string | null;
          estado?: string;
          id?: string;
        };
        Update: {
          compra_id?: string;
          creado_en?: string;
          entregado_en?: string | null;
          entregado_por?: string | null;
          estado?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pedidos_candy_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'compras';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pedidos_candy_compra_id_fkey';
            columns: ['compra_id'];
            isOneToOne: true;
            referencedRelation: 'v_compra_total';
            referencedColumns: ['compra_id'];
          },
          {
            foreignKeyName: 'pedidos_candy_entregado_por_fkey';
            columns: ['entregado_por'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pedidos_candy_entregado_por_fkey';
            columns: ['entregado_por'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      pelicula_generos: {
        Row: {
          creado_en: string;
          genero_id: number;
          pelicula_id: string;
        };
        Insert: {
          creado_en?: string;
          genero_id: number;
          pelicula_id: string;
        };
        Update: {
          creado_en?: string;
          genero_id?: number;
          pelicula_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pelicula_generos_genero_id_fkey';
            columns: ['genero_id'];
            isOneToOne: false;
            referencedRelation: 'generos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pelicula_generos_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'peliculas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pelicula_generos_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'v_ranking_peliculas';
            referencedColumns: ['pelicula_id'];
          },
        ];
      };
      peliculas: {
        Row: {
          activo: boolean;
          actualizado_en: string;
          clasificacion_id: number;
          creado_en: string;
          destacada: boolean;
          duracion_min: number;
          estado: string;
          fecha_estreno: string;
          id: string;
          imagen_path: string;
          sinopsis: string;
          titulo: string;
        };
        Insert: {
          activo?: boolean;
          actualizado_en?: string;
          clasificacion_id: number;
          creado_en?: string;
          destacada?: boolean;
          duracion_min: number;
          estado?: string;
          fecha_estreno: string;
          id?: string;
          imagen_path: string;
          sinopsis: string;
          titulo: string;
        };
        Update: {
          activo?: boolean;
          actualizado_en?: string;
          clasificacion_id?: number;
          creado_en?: string;
          destacada?: boolean;
          duracion_min?: number;
          estado?: string;
          fecha_estreno?: string;
          id?: string;
          imagen_path?: string;
          sinopsis?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'peliculas_clasificacion_id_fkey';
            columns: ['clasificacion_id'];
            isOneToOne: false;
            referencedRelation: 'clasificaciones';
            referencedColumns: ['id'];
          },
        ];
      };
      precios_butaca: {
        Row: {
          creado_en: string;
          precio: number;
          tipo_butaca_id: number;
          vigente_desde: string;
        };
        Insert: {
          creado_en?: string;
          precio: number;
          tipo_butaca_id: number;
          vigente_desde: string;
        };
        Update: {
          creado_en?: string;
          precio?: number;
          tipo_butaca_id?: number;
          vigente_desde?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'precios_butaca_tipo_butaca_id_fkey';
            columns: ['tipo_butaca_id'];
            isOneToOne: false;
            referencedRelation: 'tipos_butaca';
            referencedColumns: ['id'];
          },
        ];
      };
      precios_producto: {
        Row: {
          creado_en: string;
          precio: number;
          producto_id: string;
          vigente_desde: string;
        };
        Insert: {
          creado_en?: string;
          precio: number;
          producto_id: string;
          vigente_desde: string;
        };
        Update: {
          creado_en?: string;
          precio?: number;
          producto_id?: string;
          vigente_desde?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'precios_producto_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'productos';
            referencedColumns: ['id'];
          },
        ];
      };
      preventas: {
        Row: {
          actualizado_en: string;
          creado_en: string;
          dias_antes: number;
          habilitada: boolean;
          pelicula_id: string;
          porcentaje: number;
        };
        Insert: {
          actualizado_en?: string;
          creado_en?: string;
          dias_antes?: number;
          habilitada?: boolean;
          pelicula_id: string;
          porcentaje: number;
        };
        Update: {
          actualizado_en?: string;
          creado_en?: string;
          dias_antes?: number;
          habilitada?: boolean;
          pelicula_id?: string;
          porcentaje?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'preventas_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: true;
            referencedRelation: 'peliculas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preventas_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: true;
            referencedRelation: 'v_ranking_peliculas';
            referencedColumns: ['pelicula_id'];
          },
        ];
      };
      productos: {
        Row: {
          activo: boolean;
          actualizado_en: string;
          categoria_id: number;
          creado_en: string;
          descripcion: string | null;
          id: string;
          imagen_path: string | null;
          nombre: string;
        };
        Insert: {
          activo?: boolean;
          actualizado_en?: string;
          categoria_id: number;
          creado_en?: string;
          descripcion?: string | null;
          id?: string;
          imagen_path?: string | null;
          nombre: string;
        };
        Update: {
          activo?: boolean;
          actualizado_en?: string;
          categoria_id?: number;
          creado_en?: string;
          descripcion?: string | null;
          id?: string;
          imagen_path?: string | null;
          nombre?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'productos_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias_producto';
            referencedColumns: ['id'];
          },
        ];
      };
      recompensa_items: {
        Row: {
          cantidad: number;
          clase: string;
          creado_en: string;
          id: string;
          producto_id: string | null;
          recompensa_id: string;
        };
        Insert: {
          cantidad: number;
          clase: string;
          creado_en?: string;
          id?: string;
          producto_id?: string | null;
          recompensa_id: string;
        };
        Update: {
          cantidad?: number;
          clase?: string;
          creado_en?: string;
          id?: string;
          producto_id?: string | null;
          recompensa_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recompensa_items_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'productos';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recompensa_items_recompensa_id_fkey';
            columns: ['recompensa_id'];
            isOneToOne: false;
            referencedRelation: 'recompensas';
            referencedColumns: ['id'];
          },
        ];
      };
      recompensas: {
        Row: {
          activa: boolean;
          actualizado_en: string;
          costo_puntos: number;
          creado_en: string;
          id: string;
          nombre: string;
          tipo: string;
        };
        Insert: {
          activa?: boolean;
          actualizado_en?: string;
          costo_puntos: number;
          creado_en?: string;
          id?: string;
          nombre: string;
          tipo: string;
        };
        Update: {
          activa?: boolean;
          actualizado_en?: string;
          costo_puntos?: number;
          creado_en?: string;
          id?: string;
          nombre?: string;
          tipo?: string;
        };
        Relationships: [];
      };
      resenas: {
        Row: {
          comentario: string | null;
          creada_en: string;
          estrellas: number;
          id: string;
          pelicula_id: string;
          usuario_id: string;
        };
        Insert: {
          comentario?: string | null;
          creada_en?: string;
          estrellas: number;
          id?: string;
          pelicula_id: string;
          usuario_id: string;
        };
        Update: {
          comentario?: string | null;
          creada_en?: string;
          estrellas?: number;
          id?: string;
          pelicula_id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resenas_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'peliculas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resenas_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'v_ranking_peliculas';
            referencedColumns: ['pelicula_id'];
          },
          {
            foreignKeyName: 'resenas_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resenas_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          codigo: string;
          creado_en: string;
          id: number;
          nombre: string;
        };
        Insert: {
          codigo: string;
          creado_en?: string;
          id: number;
          nombre: string;
        };
        Update: {
          codigo?: string;
          creado_en?: string;
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
      salas: {
        Row: {
          activa: boolean;
          actualizado_en: string;
          creado_en: string;
          id: string;
          nombre: string;
          numero: number;
        };
        Insert: {
          activa?: boolean;
          actualizado_en?: string;
          creado_en?: string;
          id?: string;
          nombre: string;
          numero: number;
        };
        Update: {
          activa?: boolean;
          actualizado_en?: string;
          creado_en?: string;
          id?: string;
          nombre?: string;
          numero?: number;
        };
        Relationships: [];
      };
      tipos_butaca: {
        Row: {
          codigo: string;
          creado_en: string;
          es_accesible: boolean;
          id: number;
          nombre: string;
        };
        Insert: {
          codigo: string;
          creado_en?: string;
          es_accesible: boolean;
          id: number;
          nombre: string;
        };
        Update: {
          codigo?: string;
          creado_en?: string;
          es_accesible?: boolean;
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
      usuarios: {
        Row: {
          activo: boolean;
          actualizado_en: string;
          apellido: string;
          creado_en: string;
          email: string;
          fecha_nacimiento: string;
          foto_path: string | null;
          id: string;
          nombre: string;
          puntos: number;
          rol_id: number;
        };
        Insert: {
          activo?: boolean;
          actualizado_en?: string;
          apellido: string;
          creado_en?: string;
          email: string;
          fecha_nacimiento: string;
          foto_path?: string | null;
          id: string;
          nombre: string;
          puntos?: number;
          rol_id?: number;
        };
        Update: {
          activo?: boolean;
          actualizado_en?: string;
          apellido?: string;
          creado_en?: string;
          email?: string;
          fecha_nacimiento?: string;
          foto_path?: string | null;
          id?: string;
          nombre?: string;
          puntos?: number;
          rol_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'usuarios_rol_id_fkey';
            columns: ['rol_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      versiones_idioma: {
        Row: {
          codigo: string;
          creado_en: string;
          id: number;
          nombre: string;
        };
        Insert: {
          codigo: string;
          creado_en?: string;
          id: number;
          nombre: string;
        };
        Update: {
          codigo?: string;
          creado_en?: string;
          id?: number;
          nombre?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_adicionales_vigentes: {
        Row: {
          adicional: number;
          formato_id: number;
          vigente_desde: string;
        };
        Insert: {
          adicional: number;
          formato_id: number;
          vigente_desde: string;
        };
        Update: {
          adicional?: number;
          formato_id?: number;
          vigente_desde?: string;
        };
        Relationships: [];
      };
      v_butacas_ocupadas: {
        Row: {
          butaca_id: string | null;
          funcion_id: string | null;
        };
        Insert: {
          butaca_id?: string | null;
          funcion_id?: string | null;
        };
        Update: {
          butaca_id?: string | null;
          funcion_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'entradas_butaca_id_fkey';
            columns: ['butaca_id'];
            isOneToOne: false;
            referencedRelation: 'butacas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entradas_funcion_id_fkey';
            columns: ['funcion_id'];
            isOneToOne: false;
            referencedRelation: 'funciones';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'entradas_funcion_id_fkey';
            columns: ['funcion_id'];
            isOneToOne: false;
            referencedRelation: 'v_funcion_disponibilidad';
            referencedColumns: ['funcion_id'];
          },
        ];
      };
      v_cartelera: {
        Row: {
          activo: boolean;
          actualizado_en: string;
          clasificacion_codigo: string;
          clasificacion_edad_minima: number;
          clasificacion_id: number;
          creado_en: string;
          destacada: boolean;
          duracion_min: number;
          en_preventa: boolean;
          estado: string;
          fecha_estreno: string;
          generos: string[];
          id: string;
          imagen_path: string;
          puntuacion: number | null;
          sinopsis: string;
          titulo: string;
        };
        Insert: {
          activo: boolean;
          actualizado_en: string;
          clasificacion_codigo: string;
          clasificacion_edad_minima: number;
          clasificacion_id: number;
          creado_en: string;
          destacada: boolean;
          duracion_min: number;
          en_preventa: boolean;
          estado: string;
          fecha_estreno: string;
          generos: string[];
          id: string;
          imagen_path: string;
          puntuacion: number | null;
          sinopsis: string;
          titulo: string;
        };
        Update: {
          activo?: boolean;
          actualizado_en?: string;
          clasificacion_codigo?: string;
          clasificacion_edad_minima?: number;
          clasificacion_id?: number;
          creado_en?: string;
          destacada?: boolean;
          duracion_min?: number;
          en_preventa?: boolean;
          estado?: string;
          fecha_estreno?: string;
          generos?: string[];
          id?: string;
          imagen_path?: string;
          puntuacion?: number | null;
          sinopsis?: string;
          titulo?: string;
        };
        Relationships: [];
      };
      v_compra_total: {
        Row: {
          compra_id: string | null;
          total: number | null;
        };
        Insert: {
          compra_id?: string | null;
          total?: never;
        };
        Update: {
          compra_id?: string | null;
          total?: never;
        };
        Relationships: [];
      };
      v_facturacion_diaria: {
        Row: {
          dia: string | null;
          entradas_vendidas: number | null;
          facturacion: number | null;
        };
        Relationships: [];
      };
      v_funcion_disponibilidad: {
        Row: {
          butacas_libres: number | null;
          funcion_id: string | null;
          total_butacas: number | null;
        };
        Relationships: [];
      };
      v_pelicula_rating: {
        Row: {
          cantidad_resenas: number | null;
          pelicula_id: string | null;
          puntaje: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'resenas_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'peliculas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resenas_pelicula_id_fkey';
            columns: ['pelicula_id'];
            isOneToOne: false;
            referencedRelation: 'v_ranking_peliculas';
            referencedColumns: ['pelicula_id'];
          },
        ];
      };
      v_perfiles_publicos: {
        Row: {
          id: string | null;
          nombre: string | null;
        };
        Insert: {
          id?: string | null;
          nombre?: string | null;
        };
        Update: {
          id?: string | null;
          nombre?: string | null;
        };
        Relationships: [];
      };
      v_precios_vigentes: {
        Row: {
          precio: number;
          tipo_butaca_id: number;
          vigente_desde: string;
        };
        Insert: {
          precio: number;
          tipo_butaca_id: number;
          vigente_desde: string;
        };
        Update: {
          precio?: number;
          tipo_butaca_id?: number;
          vigente_desde?: string;
        };
        Relationships: [];
      };
      v_ranking_cartelera: {
        Row: {
          entradas_vendidas: number | null;
          pelicula_id: string | null;
          titulo: string | null;
        };
        Insert: {
          entradas_vendidas?: number | null;
          pelicula_id?: string | null;
          titulo?: string | null;
        };
        Update: {
          entradas_vendidas?: number | null;
          pelicula_id?: string | null;
          titulo?: string | null;
        };
        Relationships: [];
      };
      v_ranking_peliculas: {
        Row: {
          entradas_vendidas: number | null;
          pelicula_id: string | null;
          titulo: string | null;
        };
        Relationships: [];
      };
      v_ranking_productos: {
        Row: {
          nombre: string | null;
          producto_id: string | null;
          unidades_vendidas: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pedido_items_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'productos';
            referencedColumns: ['id'];
          },
        ];
      };
      v_saldo_credito: {
        Row: {
          saldo: number | null;
          usuario_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'movimientos_credito_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'movimientos_credito_usuario_id_fkey';
            columns: ['usuario_id'];
            isOneToOne: false;
            referencedRelation: 'v_perfiles_publicos';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      guardar_pelicula: {
        Args: { p_id: string | null; p_datos: Json; p_generos: number[]; p_version: string | null };
        Returns: string;
      };
      asignar_rol_empleado: {
        Args: { p_empleado: boolean; p_usuario_id: string };
        Returns: undefined;
      };
      canjear_recompensa: {
        Args: {
          p_butacas?: string[];
          p_funcion_id?: string;
          p_recompensa_id: string;
        };
        Returns: string;
      };
      registro_actividad_legible: {
        Args: { p_grupo?: string; p_limite?: number };
        Returns: {
          accion: string;
          autor: string;
          codigo: string;
          creado_en: string;
          detalle: string;
          entidad: string;
          grupo: string;
          id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

import { TestBed } from '@angular/core/testing';
import { Supabase } from '../supabase/supabase-client';
import { UsuariosService } from './usuarios-service';

describe('UsuariosService (US-02.07)', () => {
  function crear(respuestaRpc: { error: { message: string } | null }) {
    const llamadas: [string, unknown][] = [];
    const consulta = {
      select: () => consulta,
      order: () => consulta,
      then: (resolver: (r: unknown) => void) =>
        resolver({
          data: [
            {
              id: 'pablo',
              nombre: 'Pablo',
              apellido: 'Ruiz',
              email: 'pablo@novacinema.com',
              rol: { codigo: 'cliente' },
            },
          ],
          error: null,
        }),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Supabase,
          useValue: {
            Sup: {
              from: () => consulta,
              rpc: (funcion: string, args: unknown) => {
                llamadas.push([funcion, args]);
                return Promise.resolve(respuestaRpc);
              },
            },
          },
        },
      ],
    });
    return { servicio: TestBed.inject(UsuariosService), llamadas };
  }

  it('lista los usuarios con el código de su rol', async () => {
    const { servicio } = crear({ error: null });
    expect(await servicio.findAllConRol()).toEqual([
      {
        id: 'pablo',
        nombre: 'Pablo',
        apellido: 'Ruiz',
        email: 'pablo@novacinema.com',
        rol: 'cliente',
      },
    ]);
  });

  it('cambia el rol con la RPC asignar_rol_empleado', async () => {
    const { servicio, llamadas } = crear({ error: null });
    await servicio.asignarRolEmpleado('pablo', true);
    expect(llamadas).toEqual([
      ['asignar_rol_empleado', { p_usuario_id: 'pablo', p_empleado: true }],
    ]);
  });

  it('traduce los rechazos de la base al voseo', async () => {
    const { servicio } = crear({ error: { message: 'No puede modificar su propio rol' } });
    await expect(servicio.asignarRolEmpleado('yo', true)).rejects.toThrow(
      'No podés cambiar tu propio rol.',
    );
  });
});

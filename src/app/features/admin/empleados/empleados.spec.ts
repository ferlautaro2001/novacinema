import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth-service';
import { UsuarioConRol, UsuariosService } from '../../../core/data/usuarios-service';
import { Empleados } from './empleados';

describe('Empleados (US-02.07)', () => {
  let fixture: ComponentFixture<Empleados>;
  let raiz: HTMLElement;
  let pedidos: [string, boolean][];
  let fallar: string | null;

  const usuarios: UsuarioConRol[] = [
    {
      id: 'admin',
      nombre: 'Laura',
      apellido: 'Gómez',
      email: 'laura@novacinema.com',
      rol: 'administrador',
    },
    { id: 'ana', nombre: 'Ana', apellido: 'Pérez', email: 'ana@mail.com', rol: 'cliente' },
    {
      id: 'pablo',
      nombre: 'Pablo',
      apellido: 'Ruiz',
      email: 'pablo@novacinema.com',
      rol: 'cliente',
    },
  ];

  const filas = () =>
    Array.from(raiz.querySelectorAll('tbody tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) =>
        td.textContent!.replace(/\s+/g, ' ').trim(),
      ),
    );
  const fila = (apellido: string) =>
    Array.from(raiz.querySelectorAll('tbody tr')).find((tr) => tr.textContent!.includes(apellido))!;

  async function buscar(texto: string): Promise<void> {
    const buscador = raiz.querySelector<HTMLInputElement>('#buscador')!;
    buscador.value = texto;
    buscador.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    pedidos = [];
    fallar = null;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UsuariosService,
          useValue: {
            findAllConRol: () => Promise.resolve(usuarios),
            asignarRolEmpleado: (id: string, empleado: boolean) => {
              pedidos.push([id, empleado]);
              return fallar ? Promise.reject(new Error(fallar)) : Promise.resolve();
            },
          },
        },
        { provide: AuthService, useValue: { usuario: signal({ id: 'admin' }) } },
      ],
    });
    fixture = TestBed.createComponent(Empleados);
    raiz = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('lista los usuarios con su rol escrito', () => {
    expect(filas()).toEqual([
      ['Gómez, Laura', 'laura@novacinema.com', 'Administrador', 'Vos'],
      ['Pérez, Ana', 'ana@mail.com', 'Cliente', 'Hacer empleado'],
      ['Ruiz, Pablo', 'pablo@novacinema.com', 'Cliente', 'Hacer empleado'],
    ]);
  });

  it('busca por apellido o email (AC-02.07.02)', async () => {
    await buscar('ruiz');
    expect(filas().map((f) => f[0])).toEqual(['Ruiz, Pablo']);

    await buscar('ANA@');
    expect(filas().map((f) => f[0])).toEqual(['Pérez, Ana']);

    await buscar('nadie');
    expect(filas()).toEqual([['No hay usuarios que coincidan con “nadie”.']]);
  });

  it('habilita un empleado y el listado lo muestra (AC-02.07.01)', async () => {
    fila('Ruiz').querySelector('button')!.click();
    await fixture.whenStable();

    expect(pedidos).toEqual([['pablo', true]]);
    expect(fila('Ruiz').textContent).toContain('Empleado');
    expect(fila('Ruiz').querySelector('button')!.textContent).toContain('Volver a cliente');
    expect(raiz.querySelector('[role=status]')?.textContent).toContain(
      'Pablo Ruiz ahora es Empleado',
    );
  });

  it('puede volver a un empleado a cliente', async () => {
    fila('Ruiz').querySelector('button')!.click();
    await fixture.whenStable();
    fila('Ruiz').querySelector('button')!.click();
    await fixture.whenStable();

    expect(pedidos).toEqual([
      ['pablo', true],
      ['pablo', false],
    ]);
    expect(fila('Ruiz').textContent).toContain('Cliente');
  });

  it('si la base lo rechaza, muestra el error y no cambia el rol', async () => {
    fallar = 'Solo un administrador puede cambiar roles.';
    fila('Pérez').querySelector('button')!.click();
    await fixture.whenStable();

    expect(raiz.querySelector('[role=alert]')?.textContent).toContain(fallar);
    expect(fila('Pérez').textContent).toContain('Cliente');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, DatosRegistro, ResultadoRegistro } from '../../../core/auth/auth-service';
import { Registro } from './registro';

describe('Registro (US-02.02)', () => {
  let fixture: ComponentFixture<Registro>;
  let raiz: HTMLElement;
  let pedidos: DatosRegistro[];
  let responder: () => Promise<ResultadoRegistro>;

  const campo = (id: string) => raiz.querySelector<HTMLInputElement>(`#${id}`)!;
  const errores = (id: string) => raiz.querySelector(`#${id}-errores`)!.textContent!.trim();
  const boton = () => raiz.querySelector<HTMLButtonElement>('button[type=submit]')!;

  async function escribir(id: string, valor: string): Promise<void> {
    campo(id).value = valor;
    campo(id).dispatchEvent(new Event('input'));
    campo(id).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function elegirMes(valor: string): Promise<void> {
    const mes = raiz.querySelector<HTMLSelectElement>('#nacimiento-mes')!;
    mes.value = valor;
    mes.dispatchEvent(new Event('change'));
    mes.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function nacimiento(dia: string, mes: string, anio: string): Promise<void> {
    await escribir('nacimiento-dia', dia);
    await elegirMes(mes);
    await escribir('nacimiento-anio', anio);
  }

  async function completarAna(): Promise<void> {
    await escribir('email', 'ana@mail.com');
    await escribir('clave', 'cine2026');
    await escribir('nombre', 'Ana');
    await escribir('apellido', 'Pérez');
    await nacimiento('14', '02', '1990');
  }

  beforeEach(async () => {
    pedidos = [];
    responder = () => Promise.resolve('sesion_iniciada');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            registrarse: (datos: DatosRegistro) => {
              pedidos.push(datos);
              return responder();
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(Registro);
    raiz = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('crea la cuenta y deja la sesión iniciada (AC-02.02.01)', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await completarAna();
    expect(boton().disabled).toBe(false);

    boton().click();
    await fixture.whenStable();

    expect(pedidos).toEqual([
      {
        email: 'ana@mail.com',
        clave: 'cine2026',
        nombre: 'Ana',
        apellido: 'Pérez',
        fechaNacimiento: '1990-02-14',
      },
    ]);
    expect(navegar).toHaveBeenCalledWith('/inicio');
  });

  it('pide al menos 6 caracteres de contraseña (AC-02.02.01)', async () => {
    await escribir('clave', 'abc');

    expect(errores('clave')).toBe('La contraseña debe tener al menos 6 caracteres');
    expect(boton().disabled).toBe(true);
  });

  it('valida el email y la fecha de nacimiento', async () => {
    await escribir('email', 'ana@');
    await nacimiento('31', '02', '2000');

    expect(errores('email')).toBe('Ingresá un email válido');
    expect(errores('nacimiento')).toBe('Ingresá una fecha válida');
  });

  it('muestra el error de un email ya registrado (AC-02.02.03)', async () => {
    responder = () => Promise.reject(new Error('Ese email ya está registrado'));
    await completarAna();

    boton().click();
    await fixture.whenStable();

    expect(raiz.querySelector('[role=alert]')?.textContent).toContain(
      'Ese email ya está registrado',
    );
    expect(boton().disabled).toBe(false);
  });

  it('pide confirmar el email cuando Supabase lo exige', async () => {
    responder = () => Promise.resolve('confirmar_email');
    await completarAna();

    boton().click();
    await fixture.whenStable();

    expect(raiz.querySelector('[role=status]')?.textContent).toContain('Revisá tu email');
    expect(raiz.querySelector('form')).toBeNull();
  });

  it('avisa que hay cambios sin guardar hasta que la cuenta se crea (US-02.06)', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const registro = fixture.componentInstance;
    expect(registro.noGuardado()).toBe(false);

    await completarAna();
    expect(registro.noGuardado()).toBe(true);

    boton().click();
    await fixture.whenStable();
    expect(registro.noGuardado()).toBe(false);
  });
});

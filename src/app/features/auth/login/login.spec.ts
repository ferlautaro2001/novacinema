import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Rol } from '../../../core/models/enumerados';
import { AuthService } from '../../../core/auth/auth-service';
import { Login } from './login';

describe('Login (US-02.03)', () => {
  let fixture: ComponentFixture<Login>;
  let raiz: HTMLElement;
  let responder: () => Promise<Rol>;
  let navegar: ReturnType<typeof vi.spyOn>;

  const campo = (id: string) => raiz.querySelector<HTMLInputElement>(`#${id}`)!;
  const boton = () => raiz.querySelector<HTMLButtonElement>('button[type=submit]')!;

  async function escribir(id: string, valor: string): Promise<void> {
    campo(id).value = valor;
    campo(id).dispatchEvent(new Event('input'));
    campo(id).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function ingresar(email: string, clave: string): Promise<void> {
    await escribir('email', email);
    await escribir('clave', clave);
    boton().click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { iniciarSesion: () => responder() } },
      ],
    });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    raiz = fixture.nativeElement;
    await fixture.whenStable();
  });

  it.each([
    ['cliente', '/inicio'],
    ['empleado', '/boleteria'],
    ['administrador', '/admin'],
  ] as const)('un %s entra a %s (AC-02.03.01)', async (rol, destino) => {
    responder = () => Promise.resolve(rol);
    await ingresar('ana@mail.com', 'cine2026');

    expect(navegar).toHaveBeenCalledWith(destino);
  });

  it('con credenciales incorrectas muestra el error y se queda (AC-02.03.02)', async () => {
    responder = () => Promise.reject(new Error('Email o contraseña incorrectos'));
    await ingresar('ana@mail.com', 'equivocada');

    expect(raiz.querySelector('[role=alert]')?.textContent).toContain(
      'Email o contraseña incorrectos',
    );
    expect(navegar).not.toHaveBeenCalled();
    expect(campo('clave').value).toBe('');
    expect(campo('email').value).toBe('ana@mail.com');
  });

  it('no deja enviar sin email ni contraseña', () => {
    expect(boton().disabled).toBe(true);
  });
});

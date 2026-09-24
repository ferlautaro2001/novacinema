import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectorHora } from './selector-hora';

describe('SelectorHora (US-01.05)', () => {
  let fixture: ComponentFixture<SelectorHora>;
  let raiz: HTMLElement;
  let emitidas: string[];

  const boton = (hora: string) =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('.opcion')).find(
      (b) => b.textContent!.trim() === hora,
    )!;
  const marcadas = () =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('.opcion[aria-pressed=true]')).map((b) =>
      b.textContent!.trim(),
    );

  beforeEach(async () => {
    fixture = TestBed.createComponent(SelectorHora);
    fixture.componentRef.setInput('horarios', ['14:00', '16:30', '18:00', '20:30']);
    raiz = fixture.nativeElement;
    emitidas = [];
    fixture.componentInstance.horaElegida.subscribe((h) => emitidas.push(h));
    await fixture.whenStable();
  });

  it('elige un horario con un solo toque y solo ese queda marcado (AC-01.05.02)', async () => {
    boton('18:00').click();
    await fixture.whenStable();

    expect(emitidas).toEqual(['18:00']);
    expect(marcadas()).toEqual(['18:00']);
    expect(boton('18:00').classList).toContain('elegida');

    boton('20:30').click();
    await fixture.whenStable();
    expect(marcadas()).toEqual(['20:30']);
  });

  it('desmarca la hora si deja de estar entre los horarios', async () => {
    boton('18:00').click();
    fixture.componentRef.setInput('horarios', ['15:00', '21:00']);
    await fixture.whenStable();

    expect(marcadas()).toEqual([]);
  });

  it('avisa cuando no hay horarios', async () => {
    fixture.componentRef.setInput('horarios', []);
    await fixture.whenStable();

    expect(raiz.textContent).toContain('No hay horarios para este día.');
  });
});

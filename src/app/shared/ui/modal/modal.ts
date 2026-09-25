import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'nc-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal implements AfterViewInit, OnDestroy {
  cierre = output<void>();
  ocupado = input(false);

  private dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  // Guardo quién tenía el foco para devolvérselo al cerrar.
  private anterior: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.anterior = this.host.nativeElement.ownerDocument.activeElement as HTMLElement;
    this.dialogo().nativeElement.showModal();
  }

  // Con Escape el navegador cierra el <dialog> solo: lo freno y aviso, así lo cierra
  // quien abrió el modal (y no se cierra mientras está ocupado).
  cerrar(evento?: Event): void {
    evento?.preventDefault();
    if (!this.ocupado()) this.cierre.emit();
  }

  ngOnDestroy(): void {
    this.dialogo().nativeElement.close();
    this.anterior?.focus();
  }
}

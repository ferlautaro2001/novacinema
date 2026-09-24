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
  private anterior: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.anterior = this.host.nativeElement.ownerDocument.activeElement as HTMLElement;
    this.dialogo().nativeElement.showModal();
  }
  cerrar(evento?: Event): void {
    evento?.preventDefault();
    if (!this.ocupado()) this.cierre.emit();
  }
  ngOnDestroy(): void {
    this.dialogo().nativeElement.close();
    this.anterior?.focus();
  }
}

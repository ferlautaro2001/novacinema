import {
  afterNextRender,
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
export class Modal implements OnDestroy {
  readonly cierre = output<void>();
  readonly ocupado = input(false);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private anterior: HTMLElement | null = null;
  constructor() {
    afterNextRender(() => {
      this.anterior = this.host.nativeElement.ownerDocument.activeElement as HTMLElement;
      this.dialogo().nativeElement.showModal();
    });
  }
  protected cerrar(evento?: Event): void {
    evento?.preventDefault();
    if (!this.ocupado()) this.cierre.emit();
  }
  ngOnDestroy(): void {
    this.dialogo().nativeElement.close();
    this.anterior?.focus();
  }
}

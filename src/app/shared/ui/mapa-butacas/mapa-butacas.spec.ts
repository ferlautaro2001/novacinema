import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapaButacasComponent } from './mapa-butacas';
import { By } from '@angular/platform-browser';

describe('MapaButacasComponent (US-04.02)', () => {
  let fixture: ComponentFixture<MapaButacasComponent>;
  let component: MapaButacasComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaButacasComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MapaButacasComponent);
    component = fixture.componentInstance;
  });

  describe('AC-04.02.01: Disposición de 518 butacas', () => {
    it('muestra 420 butacas comunes, 84 VIP y 14 accesibles para un total de 518', () => {
      fixture.detectChanges();

      expect(component.totalButacas()).toBe(518);
      expect(component.totalComunes()).toBe(420);
      expect(component.totalVip()).toBe(84);
      expect(component.totalAccesibles()).toBe(14);

      const buttons = fixture.debugElement.queryAll(By.css('.butaca-btn'));
      expect(buttons.length).toBe(518);
    });

    it('la fila común A tiene A1 a A4, A6 a A25 y A27 a A30, y no existen A5 ni A26', () => {
      fixture.detectChanges();

      const btnA1 = fixture.debugElement.query(By.css('button[data-id="A1"]'));
      const btnA4 = fixture.debugElement.query(By.css('button[data-id="A4"]'));
      const btnA5 = fixture.debugElement.query(By.css('button[data-id="A5"]'));
      const btnA6 = fixture.debugElement.query(By.css('button[data-id="A6"]'));
      const btnA25 = fixture.debugElement.query(By.css('button[data-id="A25"]'));
      const btnA26 = fixture.debugElement.query(By.css('button[data-id="A26"]'));
      const btnA27 = fixture.debugElement.query(By.css('button[data-id="A27"]'));
      const btnA30 = fixture.debugElement.query(By.css('button[data-id="A30"]'));

      expect(btnA1).not.toBeNull();
      expect(btnA4).not.toBeNull();
      expect(btnA5).toBeNull();
      expect(btnA6).not.toBeNull();
      expect(btnA25).not.toBeNull();
      expect(btnA26).toBeNull();
      expect(btnA27).not.toBeNull();
      expect(btnA30).not.toBeNull();
    });

    it('la fila K se muestra como espacio libre de circulación sin butacas', () => {
      fixture.detectChanges();

      const circulacion = fixture.debugElement.query(By.css('.fila-circulacion'));
      expect(circulacion).not.toBeNull();
      expect(circulacion.nativeElement.textContent).toContain('FILA K');

      const btnK = fixture.debugElement.query(By.css('button[data-id^="K"]'));
      expect(btnK).toBeNull();
    });
  });

  describe('AC-04.02.02: Fila J accesible', () => {
    it('la fila J solo tiene J2, J3, J11 a J20, J28 y J29', () => {
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('button[data-id="J1"]'))).toBeNull();
      expect(fixture.debugElement.query(By.css('button[data-id="J2"]'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('button[data-id="J3"]'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('button[data-id="J4"]'))).toBeNull();

      expect(fixture.debugElement.query(By.css('button[data-id="J11"]'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('button[data-id="J20"]'))).not.toBeNull();

      expect(fixture.debugElement.query(By.css('button[data-id="J27"]'))).toBeNull();
      expect(fixture.debugElement.query(By.css('button[data-id="J28"]'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('button[data-id="J29"]'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('button[data-id="J30"]'))).toBeNull();
    });
  });

  describe('AC-04.02.03: Tipos de butaca diferenciados', () => {
    it('muestra las referencias de Común, VIP y Accesible', () => {
      fixture.detectChanges();

      const referencias = fixture.debugElement.query(By.css('.referencias'));
      expect(referencias).not.toBeNull();
      expect(referencias.nativeElement.textContent).toContain('Común');
      expect(referencias.nativeElement.textContent).toContain('VIP');
      expect(referencias.nativeElement.textContent).toContain('Accesible');
    });

    it('las filas R, S y T usan estilo VIP y la fila J usa ícono accesible', () => {
      fixture.detectChanges();

      const btnR1 = fixture.debugElement.query(By.css('button[data-id="R1"]'));
      const btnS1 = fixture.debugElement.query(By.css('button[data-id="S1"]'));
      const btnT1 = fixture.debugElement.query(By.css('button[data-id="T1"]'));
      const btnJ2 = fixture.debugElement.query(By.css('button[data-id="J2"]'));

      expect(btnR1.nativeElement.classList.contains('t-vip')).toBe(true);
      expect(btnS1.nativeElement.classList.contains('t-vip')).toBe(true);
      expect(btnT1.nativeElement.classList.contains('t-vip')).toBe(true);

      expect(btnJ2.nativeElement.classList.contains('t-accesible')).toBe(true);
      expect(btnJ2.nativeElement.querySelector('.seat-icon-wc')).not.toBeNull();
    });
  });

  describe('AC-04.02.04: Vista 2D por defecto y 3D a pedido', () => {
    it('abre en vista 2D por defecto y tiene visible el botón 3D', () => {
      fixture.detectChanges();

      expect(component.vista()).toBe('2d');
      const btn2d = fixture.debugElement.query(By.css('#btn-vista-2d'));
      const btn3d = fixture.debugElement.query(By.css('#btn-vista-3d, #btn-vista-3d-deshabilitado'));

      expect(btn2d).not.toBeNull();
      expect(btn3d).not.toBeNull();
      expect(btn2d.nativeElement.classList.contains('activo')).toBe(true);
    });

    it('pasa a 3D y vuelve a 2D conservando la selección', () => {
      component.soporta = true;
      fixture.componentRef.setInput('modo', 'elegir');
      fixture.componentRef.setInput('seleccionadas', ['H11', 'H12']);
      fixture.detectChanges();

      expect(component.butacasLista().find((b) => b.id === 'H11')?.seleccionada).toBe(true);

      component.cambiarVista('3d');
      fixture.detectChanges();
      expect(component.vista()).toBe('3d');
      expect(component.butacasLista().find((b) => b.id === 'H11')?.seleccionada).toBe(true);

      component.cambiarVista('2d');
      fixture.detectChanges();
      expect(component.vista()).toBe('2d');
      expect(component.butacasLista().find((b) => b.id === 'H11')?.seleccionada).toBe(true);
    });

    it('en navegador sin WebGL, el botón 3D aparece deshabilitado con aviso y el mapa 2D funciona', () => {
      component.soporta = false;
      fixture.detectChanges();

      expect(component.vista()).toBe('2d');
      const btnNo3d = fixture.debugElement.query(By.css('#btn-vista-3d-deshabilitado'));
      expect(btnNo3d).not.toBeNull();
      expect(btnNo3d.nativeElement.disabled).toBe(true);
      expect(btnNo3d.nativeElement.textContent).toContain('3D no disponible en este navegador');
    });
  });

  describe('AC-04.02.05: Cámaras 3D y zoom del mapa 2D', () => {
    it('zoom 2D acerca, aleja y ajusta con indicador de porcentaje', () => {
      fixture.detectChanges();

      expect(component.zoomPorcentaje()).toBe(100);

      const btnZoomIn = fixture.debugElement.query(By.css('#btn-zoom-in'));
      btnZoomIn.nativeElement.click();
      fixture.detectChanges();

      expect(component.zoomPorcentaje()).toBeGreaterThan(100);
      const indicador = fixture.debugElement.query(By.css('#zoom-indicador'));
      expect(indicador.nativeElement.textContent).toBe(`${component.zoomPorcentaje()}%`);

      const btnZoomFit = fixture.debugElement.query(By.css('#btn-zoom-fit'));
      btnZoomFit.nativeElement.click();
      fixture.detectChanges();

      expect(component.zoomPorcentaje()).toBe(100);
    });

    it('el dock 3D cambia de cámara y activa el botón correspondiente', () => {
      component.soporta = true;
      component.cambiarVista('3d');
      fixture.detectChanges();

      component.cambiarCamara('top');
      fixture.detectChanges();
      expect(component.camaraActiva()).toBe('top');

      component.cambiarCamara('side');
      fixture.detectChanges();
      expect(component.camaraActiva()).toBe('side');

      component.cambiarCamara('stage');
      fixture.detectChanges();
      expect(component.camaraActiva()).toBe('stage');
    });

    it('el botón Modo función alterna luces de sala con mensaje', () => {
      component.soporta = true;
      component.cambiarVista('3d');
      fixture.detectChanges();

      expect(component.modoFuncion()).toBe(false);

      const btnModoFuncion = fixture.debugElement.query(By.css('#btn-modo-funcion'));
      btnModoFuncion.nativeElement.click();
      fixture.detectChanges();

      expect(component.modoFuncion()).toBe(true);
      expect(component.mensajeNotificacion()).toBe('Modo función: se apagan las luces…');

      btnModoFuncion.nativeElement.click();
      fixture.detectChanges();

      expect(component.modoFuncion()).toBe(false);
      expect(component.mensajeNotificacion()).toBe('Luces de sala encendidas');
    });
  });

  describe('AC-04.02.06: Modo de solo lectura en el Panel', () => {
    it('en modo ver no permite seleccionar, no muestra panel ni botón continuar y muestra tooltip con tipo', () => {
      fixture.componentRef.setInput('modo', 'ver');
      fixture.detectChanges();

      const panelSeleccion = fixture.debugElement.query(By.css('#panel-seleccion'));
      const btnContinuar = fixture.debugElement.query(By.css('#btn-continuar'));
      expect(panelSeleccion).toBeNull();
      expect(btnContinuar).toBeNull();

      const btnH11 = fixture.debugElement.query(By.css('button[data-id="H11"]'));
      expect(btnH11).not.toBeNull();
      btnH11.nativeElement.click();
      fixture.detectChanges();

      const h11 = component.butacasLista().find((b) => b.id === 'H11');
      expect(h11?.seleccionada).toBe(false);

      const tooltip = fixture.debugElement.query(By.css('.mapa-tooltip'));
      expect(tooltip).not.toBeNull();
      expect(tooltip.nativeElement.textContent).toContain('H11 · Común');
    });

    it('en modo elegir muestra panel de selección, total y permite seleccionar', () => {
      fixture.componentRef.setInput('modo', 'elegir');
      fixture.detectChanges();

      const panelSeleccion = fixture.debugElement.query(By.css('#panel-seleccion'));
      const btnContinuar = fixture.debugElement.query(By.css('#btn-continuar'));
      expect(panelSeleccion).not.toBeNull();
      expect(btnContinuar).not.toBeNull();

      const btnH11 = fixture.debugElement.query(By.css('button[data-id="H11"]'));
      btnH11.nativeElement.click();
      fixture.detectChanges();

      expect(component.seleccionInterna()).toContain('H11');
      expect(component.totalPrecio()).toBe(8500);
      expect(btnContinuar.nativeElement.disabled).toBe(false);
    });
  });
});

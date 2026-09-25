import {
  Directive,
  ElementRef,
  inject,
  input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  output,
  SimpleChanges,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { ButacaMapa, FILAS, FILAS_VIP } from './distribucion';
import { soportaWebgl } from '../../directivas/si-webgl';

// A cada butaca le guardo su posición en la escena y si tiene el puntero encima.
type ButacaEscena = ButacaMapa & { x?: number; y?: number; z?: number; hover?: boolean };

type Fila3d = { z: number; y: number; d: number };

// Monta la sala en Three.js sobre el <canvas> y la mantiene al día con las butacas,
// la cámara elegida y el modo función.
@Directive({
  selector: 'canvas[appSala3d]',
})
export class Sala3dDirective implements OnInit, OnChanges, OnDestroy {
  butacas = input<ButacaMapa[]>([]);
  camaraActiva = input<string>('overview');
  modo = input<'ver' | 'elegir'>('ver');
  modoFuncion = input<boolean>(false);

  butacaClick = output<ButacaMapa>();
  butacaHover = output<{ butaca: ButacaMapa | null; x: number; y: number }>();
  cambioCamara = output<string>();
  cambioModoFuncion = output<boolean>();
  notificacion = output<string>();

  private el = inject(ElementRef<HTMLCanvasElement>);
  private ngZone = inject(NgZone);

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: OrbitControls | null = null;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private idAnimacion: number | null = null;
  private observadorTamanio: ResizeObserver | null = null;
  private quitarEventos: (() => void)[] = [];

  private clock = new THREE.Clock();
  // 1 = luces de sala prendidas, 0 = apagadas (modo función). luzSala va hacia el objetivo.
  private luzSalaObjetivo = 1;
  private luzSala = 1;

  private seleccionables: THREE.InstancedMesh[] = [];
  private apliques: THREE.PointLight[] = [];
  private screenMat: THREE.ShaderMaterial | null = null;
  private screenLight: THREE.RectAreaLight | null = null;
  private hemi: THREE.HemisphereLight | null = null;
  private key: THREE.SpotLight | null = null;

  private vuelo: {
    p0: THREE.Vector3;
    t0: THREE.Vector3;
    p1: THREE.Vector3;
    t1: THREE.Vector3;
    start: number;
    dur: number;
    arc: number;
  } | null = null;
  private modoCamara: 'orbit' | 'pov' = 'orbit';
  private povBase = new THREE.Vector3();
  private povOffset = new THREE.Vector2();
  private lookTarget = new THREE.Vector3(0, 5, 12);
  private screenCenter = new THREE.Vector3(0, 12.5, -11);

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private puntero = { x: 0, y: 0, cx: 0, cy: 0, movido: false };
  private resaltada: ButacaEscena | null = null;
  private inicioToque: { x: number; y: number } | null = null;

  // Uniforms compartidos por los shaders de la sala.
  private U = {
    uTime: { value: 0 },
    uTint: { value: new THREE.Color(0.4, 0.35, 1) },
    uHouse: { value: 1 },
  };

  private actualizarButaca: ((s: ButacaEscena) => void) | null = null;

  ngOnInit(): void {
    if (!soportaWebgl()) return;
    // El loop de render corre fuera de Angular para no disparar detección de cambios en cada cuadro.
    this.ngZone.runOutsideAngular(() => this.iniciarEscena());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['butacas'] && this.actualizarButaca) {
      for (const s of this.butacas()) this.actualizarButaca(s);
    }
    if (changes['camaraActiva'] && !changes['camaraActiva'].firstChange) {
      this.preset(this.camaraActiva());
    }
    if (changes['modoFuncion'] && !changes['modoFuncion'].firstChange) {
      this.setModoFuncion(this.modoFuncion());
    }
  }

  ngOnDestroy(): void {
    this.liberarRecursos();
  }

  preset(name: string): void {
    const presets: Record<string, [THREE.Vector3, THREE.Vector3]> = {
      overview: [new THREE.Vector3(0, 33, 76), new THREE.Vector3(0, 5, 12)],
      top: [new THREE.Vector3(0, 86, 34), new THREE.Vector3(0, 0, 20)],
      side: [new THREE.Vector3(-58, 24, 36), new THREE.Vector3(0, 5, 14)],
      stage: [new THREE.Vector3(0, 7, -6), new THREE.Vector3(0, 7, 30)],
    };
    if (!presets[name] || !this.camera) return;

    const [p, t] = presets[name];
    if (name === 'stage') {
      this.volarA(p, t, { arc: 2 });
    } else {
      // En pantallas angostas alejo la cámara para que entre toda la sala.
      const aspect = this.camera.aspect;
      const k = aspect < 1.2 ? Math.min(1.6, 0.9 / aspect) : 1;
      const lejos = t.clone().add(p.clone().sub(t).multiplyScalar(k));
      this.volarA(lejos, t, { arc: 8 });
    }
    this.cambioCamara.emit(name);
  }

  setModoFuncion(activo: boolean): void {
    this.luzSalaObjetivo = activo ? 0 : 1;
    this.notificacion.emit(
      activo ? 'Modo función: se apagan las luces…' : 'Luces de sala encendidas',
    );
  }

  onResize(): void {
    if (!this.renderer || !this.camera) return;
    const canvas = this.el.nativeElement;
    const parent = canvas.parentElement || canvas;
    const width = parent.clientWidth || 800;
    const height = parent.clientHeight || 600;
    if (width <= 0 || height <= 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
    this.bloom?.resolution.set(width, height);
  }

  // Doble clic sobre una butaca: la cámara va a los ojos de quien se sienta ahí.
  private entrarPOV(s: ButacaEscena): void {
    const eye = new THREE.Vector3(
      s.x || 0,
      (s.y || 0) + (s.tipo === 'vip' ? 1.75 : 1.9),
      (s.z || 0) + 0.15,
    );
    this.povBase.copy(this.screenCenter);
    this.povOffset.set(0, 0);
    this.volarA(eye, this.screenCenter, { dur: 2.2, arc: 5, pov: true });
    this.resaltar(null);
    this.cambioCamara.emit('pov');
  }

  private volarA(
    pos: THREE.Vector3,
    target: THREE.Vector3,
    { dur = 1.8, arc = 6, pov = false } = {},
  ): void {
    if (!this.controls || !this.camera) return;
    if (this.modoCamara === 'orbit') {
      this.lookTarget.copy(this.controls.target);
    }
    this.controls.enabled = false;
    this.modoCamara = pov ? 'pov' : 'orbit';
    this.vuelo = {
      p0: this.camera.position.clone(),
      t0: this.lookTarget.clone(),
      p1: pos.clone(),
      t1: target.clone(),
      start: performance.now(),
      dur: dur * 1000,
      arc,
    };
  }

  private iniciarEscena(): void {
    const canvas = this.el.nativeElement;
    const parent = canvas.parentElement || canvas;
    const width = parent.clientWidth || 800;
    const height = parent.clientHeight || 600;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    this.renderer = renderer;
    const DPR = Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(DPR);
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    try {
      RectAreaLightUniformsLib.init();
    } catch {}

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);
    scene.fog = new THREE.FogExp2(0x05060a, 0.0065);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.05, 400);
    camera.position.set(0, 33, 76);
    this.camera = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 190;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0, 5, 12);
    controls.enabled = true;
    this.controls = controls;
    this.lookTarget.copy(controls.target);

    // Si el post-procesado falla, dibujo directo con el renderer.
    try {
      const composer = new EffectComposer(
        renderer,
        new THREE.WebGLRenderTarget(width, height, {
          type: THREE.HalfFloatType,
          samples: 4,
        }),
      );
      composer.setPixelRatio(DPR);
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.85, 0.6, 0.8);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      this.bloom = bloom;
      this.composer = composer;
    } catch {
      this.composer = null;
    }

    this.armarSala(scene);
    this.escucharEventos(canvas);

    this.observadorTamanio = new ResizeObserver(() => this.onResize());
    this.observadorTamanio.observe(parent);

    const cuadro = () => {
      this.idAnimacion = requestAnimationFrame(cuadro);
      this.dibujarCuadro();
    };
    cuadro();
  }

  private armarSala(scene: THREE.Scene): void {
    const SX = 1.62;
    const colX = (c: number) => (c - 15.5) * SX + (c > 5 ? 0.7 : 0) + (c > 26 ? 0.7 : 0) - 0.7;

    // Profundidad (d), altura (y) y posición (z) de cada fila, de atrás (T) hacia adelante (A).
    const filas3d: Record<string, Fila3d> = {};
    let z = 0;
    let y = 0.25;
    let dAnterior = 0;
    [...FILAS].reverse().forEach((r, i) => {
      const esVip = FILAS_VIP.includes(r);

      let d = 2.05;
      if (esVip) d = 2.6;
      else if (r === 'K') d = 2.8;
      else if (r === 'J') d = 2.5;

      if (i > 0) {
        z += dAnterior / 2 + d / 2;
        // La J (accesible) queda a la misma altura que la K, sin escalón.
        if (esVip) y += 0.32;
        else if (r === 'K') y += 0.3;
        else if (r !== 'J') y += 0.45;
      }
      filas3d[r] = { z, y, d };
      dAnterior = d;
    });

    const HALL_X = 31;
    const SCREEN = { w: 50, h: 20, y: 13, z: -11, R: 90 };
    const FRONT_Z = -13;
    const BACK_Z = filas3d['A'].z + filas3d['A'].d / 2 + 3.5;
    const CEIL = 30;
    const aisleXs = [colX(5), colX(26), -28.5, 28.5];

    const matCarpet = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      color: 0x1d1e26,
    });
    const matRiser = new THREE.MeshStandardMaterial({
      color: 0x14151c,
      roughness: 0.85,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL_X * 2, BACK_Z - FRONT_Z), matCarpet);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (BACK_Z + FRONT_Z) / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Escalones con la tira de LED que late en los pasillos.
    const ledStepMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.U,
        uAisles: { value: aisleXs },
        uColor: { value: new THREE.Color(0.25, 0.42, 1.0) },
      },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        uniform float uTime, uHouse; uniform vec3 uColor; uniform float uAisles[4]; varying vec3 vW;
        void main(){
          float peaks = 0.;
          for(int i=0;i<4;i++) peaks += exp(-abs(vW.x-uAisles[i])*1.4);
          float wave = exp(-pow(abs(abs(vW.x) - mod(uTime*10. + vW.z*0.9, 70.)), 2.)*0.06);
          float lvl = mix(1.35, 0.8, uHouse);
          vec3 c = uColor * (0.22 + peaks*1.8 + wave*1.1) * lvl;
          gl_FragColor = vec4(c, 1.);
        }`,
    });

    for (const r of FILAS) {
      const { z, y, d } = filas3d[r];
      const riser = new THREE.Mesh(new THREE.BoxGeometry(HALL_X * 2, y, d), matRiser);
      riser.position.set(0, y / 2, z);
      riser.receiveShadow = true;
      scene.add(riser);

      const top = new THREE.Mesh(new THREE.PlaneGeometry(HALL_X * 2, d), matCarpet);
      top.rotation.x = -Math.PI / 2;
      top.position.set(0, y + 0.005, z);
      top.receiveShadow = true;
      scene.add(top);

      const led = new THREE.Mesh(new THREE.BoxGeometry(HALL_X * 2 - 0.2, 0.035, 0.03), ledStepMat);
      led.position.set(0, y - 0.04, z - d / 2 - 0.02);
      scene.add(led);
    }

    // Paredes con apliques y techo.
    const matWall = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      color: 0x181922,
    });
    const hallLen = BACK_Z - FRONT_Z;

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(hallLen, CEIL), matWall);
      wall.position.set(side * HALL_X, CEIL / 2, (BACK_Z + FRONT_Z) / 2);
      wall.rotation.y = (-side * Math.PI) / 2;
      scene.add(wall);

      for (const z of [0, 10, 20, 30, 40]) {
        const y = 11.5 + z * 0.08;
        const pl = new THREE.PointLight(0xffa860, 40, 26, 2);
        pl.position.set(side * (HALL_X - 1.5), y, z);
        scene.add(pl);
        this.apliques.push(pl);
      }
    }

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_X * 2, hallLen),
      new THREE.MeshStandardMaterial({ color: 0x07080d, roughness: 1 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, CEIL, (BACK_Z + FRONT_Z) / 2);
    scene.add(ceiling);

    // Pantalla curva.
    const screenMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.U,
        uPower: { value: 1 },
      },
      side: THREE.BackSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `
        uniform float uTime, uPower; uniform vec3 uTint; varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5;
          float glow = 1.0 - length(p)*0.8;
          vec3 col = uTint * glow * 1.4;
          gl_FragColor = vec4(col * uPower, 1.0);
        }`,
    });
    this.screenMat = screenMat;

    const L = SCREEN.w / SCREEN.R;
    const screen = new THREE.Mesh(
      new THREE.CylinderGeometry(SCREEN.R, SCREEN.R, SCREEN.h, 64, 1, true, Math.PI - L / 2, L),
      screenMat,
    );
    screen.position.set(0, SCREEN.y, SCREEN.z + SCREEN.R);
    scene.add(screen);

    const screenLight = new THREE.RectAreaLight(0x8877ff, 1.4, SCREEN.w, SCREEN.h);
    screenLight.position.set(0, SCREEN.y, SCREEN.z + 1.5);
    screenLight.lookAt(0, 4, 30);
    scene.add(screenLight);
    this.screenLight = screenLight;

    const hemi = new THREE.HemisphereLight(0xdde8ff, 0x11131a, 0.45);
    scene.add(hemi);
    this.hemi = hemi;

    const key = new THREE.SpotLight(0xdfe4ff, 2600, 0, 0.95, 0.85, 2);
    key.position.set(0, CEIL - 1, 18);
    key.target.position.set(0, 3, 20);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 5;
    key.shadow.camera.far = 50;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    scene.add(key, key.target);
    this.key = key;

    this.armarButacas(scene, filas3d, colX);
  }

  // Todas las butacas van en un solo InstancedMesh; cada una es una instancia con su color.
  private armarButacas(
    scene: THREE.Scene,
    filas3d: Record<string, Fila3d>,
    colX: (c: number) => number,
  ): void {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
    });

    const colores: Record<string, number> = {
      comun: 0x434857,
      vip: 0x86283a,
      accesible: 0x2b5fd8,
      ocupada: 0x18191e,
      bloqueada: 0x202128,
      seleccionada: 0x4a86ff,
    };

    const seats: ButacaEscena[] = this.butacas();
    for (const s of seats) {
      const fila = filas3d[s.fila];
      if (fila) {
        s.x = colX(s.columna);
        s.y = fila.y;
        s.z = fila.z - 0.1;
      }
    }

    if (seats.length === 0) return;

    const seatMesh = new THREE.InstancedMesh(
      new RoundedBoxGeometry(1.12, 0.95, 0.85, 2, 0.08),
      bodyMat,
      seats.length,
    );
    seatMesh.castShadow = true;
    seatMesh.receiveShadow = true;
    seatMesh.userData['seats'] = seats;
    this.seleccionables = [seatMesh];
    scene.add(seatMesh);

    const matriz = new THREE.Matrix4();
    const color = new THREE.Color();

    const pintar = (s: ButacaEscena, idx: number) => {
      const lift = s.hover && s.estado === 'disponible' ? 0.14 : 0;
      matriz.makeTranslation(s.x || 0, (s.y || 0) + 0.48 + lift, s.z || 0);
      seatMesh.setMatrixAt(idx, matriz);

      let clave: string = s.tipo;
      if (s.seleccionada) clave = 'seleccionada';
      else if (s.estado !== 'disponible') clave = s.estado;

      color.setHex(colores[clave] ?? colores['comun']);
      if (s.hover) color.multiplyScalar(1.4);
      seatMesh.setColorAt(idx, color);
    };

    this.actualizarButaca = (s: ButacaEscena) => {
      const idx = seats.indexOf(s);
      if (idx >= 0) {
        pintar(s, idx);
        seatMesh.instanceMatrix.needsUpdate = true;
        if (seatMesh.instanceColor) seatMesh.instanceColor.needsUpdate = true;
      }
    };

    seats.forEach((s, i) => pintar(s, i));
    seatMesh.instanceMatrix.needsUpdate = true;
    if (seatMesh.instanceColor) seatMesh.instanceColor.needsUpdate = true;
  }

  private escucharEventos(canvas: HTMLCanvasElement): void {
    const alMover = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.puntero.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.puntero.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.puntero.cx = e.clientX;
      this.puntero.cy = e.clientY;
      this.puntero.movido = true;
    };

    const alPresionar = (e: PointerEvent) => {
      this.inicioToque = { x: e.clientX, y: e.clientY };
    };

    // Si el puntero se movió más de 6px entre presionar y soltar, fue un arrastre de la cámara.
    const alSoltar = (e: PointerEvent) => {
      if (!this.inicioToque) return;
      if (Math.hypot(e.clientX - this.inicioToque.x, e.clientY - this.inicioToque.y) > 6) return;

      const s = this.butacaBajoPuntero();
      if (s && this.modo() === 'elegir') {
        this.ngZone.run(() => this.butacaClick.emit(s));
      }
    };

    const alDobleClic = () => {
      const s = this.butacaBajoPuntero();
      if (s) this.entrarPOV(s);
    };

    const alSalir = () => {
      this.resaltar(null);
      this.ngZone.run(() => this.butacaHover.emit({ butaca: null, x: 0, y: 0 }));
    };

    canvas.addEventListener('pointermove', alMover);
    canvas.addEventListener('pointerdown', alPresionar);
    canvas.addEventListener('pointerup', alSoltar);
    canvas.addEventListener('dblclick', alDobleClic);
    canvas.addEventListener('pointerleave', alSalir);

    this.quitarEventos.push(
      () => canvas.removeEventListener('pointermove', alMover),
      () => canvas.removeEventListener('pointerdown', alPresionar),
      () => canvas.removeEventListener('pointerup', alSoltar),
      () => canvas.removeEventListener('dblclick', alDobleClic),
      () => canvas.removeEventListener('pointerleave', alSalir),
    );
  }

  private butacaBajoPuntero(): ButacaEscena | null {
    if (!this.camera || this.seleccionables.length === 0) return null;
    this.raycaster.setFromCamera(this.ndc.set(this.puntero.x, this.puntero.y), this.camera);
    const hit = this.raycaster.intersectObjects(this.seleccionables, false)[0];
    if (!hit || hit.instanceId === undefined) return null;
    return hit.object.userData['seats']?.[hit.instanceId] ?? null;
  }

  private resaltar(s: ButacaEscena | null): void {
    if (this.resaltada === s) return;
    const anterior = this.resaltada;
    this.resaltada = s;
    if (anterior) {
      anterior.hover = false;
      this.actualizarButaca?.(anterior);
    }
    if (s) {
      s.hover = true;
      this.actualizarButaca?.(s);
    }

    let cursor = '';
    if (s) cursor = s.estado === 'disponible' ? 'pointer' : 'not-allowed';
    this.el.nativeElement.style.cursor = cursor;
  }

  private dibujarCuadro(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.U.uTime.value += dt;

    this.luzSala += (this.luzSalaObjetivo - this.luzSala) * (1 - Math.exp(-dt * 1.8));
    this.U.uHouse.value = this.luzSala;
    const show = 1 - this.luzSala;

    if (this.screenMat) this.screenMat.uniforms['uPower'].value = 0.85 + show * 0.2;
    if (this.screenLight) this.screenLight.intensity = 1.3 + show * 1.6;
    if (this.hemi) this.hemi.intensity = 0.12 + this.luzSala * 0.45;
    if (this.key) this.key.intensity = 300 + this.luzSala * 2300;
    for (const l of this.apliques) {
      l.intensity = 6 + this.luzSala * 34;
    }

    if (this.vuelo) {
      const k = Math.min((performance.now() - this.vuelo.start) / this.vuelo.dur, 1);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.camera.position.lerpVectors(this.vuelo.p0, this.vuelo.p1, e);
      this.camera.position.y += Math.sin(Math.PI * e) * this.vuelo.arc;
      this.lookTarget.lerpVectors(this.vuelo.t0, this.vuelo.t1, e);
      this.camera.lookAt(this.lookTarget);

      if (k >= 1) {
        this.vuelo = null;
        if (this.modoCamara === 'orbit' && this.controls) {
          this.controls.target.copy(this.lookTarget);
          this.controls.enabled = true;
          this.controls.update();
        }
      }
    } else if (this.modoCamara === 'pov') {
      // Desde la butaca, la mirada sigue un poco al puntero.
      this.povOffset.x += (this.puntero.x * 16 - this.povOffset.x) * (1 - Math.exp(-dt * 3));
      this.povOffset.y += (this.puntero.y * 7 - this.povOffset.y) * (1 - Math.exp(-dt * 3));
      this.lookTarget.set(
        this.povBase.x + this.povOffset.x,
        this.povBase.y + this.povOffset.y,
        this.povBase.z,
      );
      this.camera.lookAt(this.lookTarget);
    } else if (this.controls) {
      this.controls.update();
    }

    if (this.puntero.movido && !this.vuelo && this.modoCamara === 'orbit') {
      this.puntero.movido = false;
      const s = this.butacaBajoPuntero();
      this.resaltar(s);
      this.ngZone.run(() => {
        this.butacaHover.emit({ butaca: s, x: this.puntero.cx, y: this.puntero.cy });
      });
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private liberarRecursos(): void {
    if (this.idAnimacion !== null) {
      cancelAnimationFrame(this.idAnimacion);
      this.idAnimacion = null;
    }
    this.observadorTamanio?.disconnect();
    this.observadorTamanio = null;

    for (const quitar of this.quitarEventos) quitar();
    this.quitarEventos = [];

    this.controls?.dispose();
    this.controls = null;
    this.composer?.dispose();
    this.composer = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }
}

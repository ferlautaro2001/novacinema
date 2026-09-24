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
import {
  ButacaMapa,
  FILAS,
  FILAS_VIP,
  PASILLOS,
} from '../../../core/reglas/butacas';
import { soportaWebgl } from '../../directivas/si-webgl';

// Directiva de atributo appSala3d sobre <canvas> (US-04.02).
// Monta la escena 3D en Three.js 0.170, sincroniza butacas, cámaras y modo función.
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
  private animId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  private clock = new THREE.Clock();
  private active = true;
  private houseTarget = 1;
  private house = 1;

  private seats: ButacaMapa[] = [];
  private seatById = new Map<string, ButacaMapa>();
  private pickables: THREE.InstancedMesh[] = [];
  private rings = new Map<ButacaMapa, THREE.Mesh>();
  private spriteGroup = new THREE.Group();
  private labelSprites: THREE.Sprite[] = [];
  private sconceLights: THREE.PointLight[] = [];
  private curtains: THREE.Mesh[] = [];
  private silB: THREE.InstancedMesh | null = null;
  private silH: THREE.InstancedMesh | null = null;
  private stars: THREE.Points | null = null;
  private fins: THREE.InstancedMesh | null = null;

  private screenMat: THREE.ShaderMaterial | null = null;
  private screenLight: THREE.RectAreaLight | null = null;
  private ringMat: THREE.MeshBasicMaterial | null = null;
  private ringGeo: THREE.BufferGeometry | null = null;
  private beamMat: THREE.ShaderMaterial | null = null;
  private dustMat: THREE.ShaderMaterial | null = null;
  private hemi: THREE.HemisphereLight | null = null;
  private key: THREE.SpotLight | null = null;
  private bloom: UnrealBloomPass | null = null;

  private fly: {
    p0: THREE.Vector3;
    t0: THREE.Vector3;
    p1: THREE.Vector3;
    t1: THREE.Vector3;
    start: number;
    dur: number;
    arc: number;
  } | null = null;
  private cameraMode: 'orbit' | 'pov' = 'orbit';
  private povBase = new THREE.Vector3();
  private povOffset = new THREE.Vector2();
  private lookTarget = new THREE.Vector3(0, 5, 12);
  private screenCenter = new THREE.Vector3(0, 12.5, -11);

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private pointer = { x: 0, y: 0, cx: 0, cy: 0, dirty: false };
  private hovered: ButacaMapa | null = null;
  private downAt: { x: number; y: number; t: number } | null = null;

  private U = {
    uTime: { value: 0 },
    uTint: { value: new THREE.Color(0.4, 0.35, 1) },
    uHouse: { value: 1 },
  };

  private iconMats: Record<string, THREE.SpriteMaterial> = {};
  private updateSeatFn: ((s: ButacaMapa) => void) | null = null;
  private updateSpriteFn: ((s: ButacaMapa) => void) | null = null;

  private listeners: (() => void)[] = [];

  ngOnInit(): void {
    if (!soportaWebgl()) return;

    this.ngZone.runOutsideAngular(() => {
      this.init3D();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['butacas'] && this.updateSeatFn) {
      this.syncButacas();
    }
    if (changes['camaraActiva'] && !changes['camaraActiva'].firstChange) {
      this.preset(this.camaraActiva());
    }
    if (changes['modoFuncion'] && !changes['modoFuncion'].firstChange) {
      this.setModoFuncion(this.modoFuncion());
    }
  }

  ngOnDestroy(): void {
    this.dispose();
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
    const fitPos = (pos: THREE.Vector3, tgt: THREE.Vector3) => {
      const aspect = this.camera ? this.camera.aspect : 1;
      const k = aspect < 1.2 ? Math.min(1.6, 0.9 / aspect) : 1;
      return tgt.clone().add(pos.clone().sub(tgt).multiplyScalar(k));
    };

    this.flyTo(name === 'stage' ? p : fitPos(p, t), t, {
      arc: name === 'stage' ? 2 : 8,
    });
    this.cambioCamara.emit(name);
  }

  toggleModoFuncion(): void {
    const nuevo = this.houseTarget === 0;
    this.setModoFuncion(nuevo);
    this.cambioModoFuncion.emit(!nuevo);
  }

  setModoFuncion(modoFuncionActivo: boolean): void {
    this.houseTarget = modoFuncionActivo ? 0 : 1;
    this.notificacion.emit(
      modoFuncionActivo
        ? 'Modo función: se apagan las luces…'
        : 'Luces de sala encendidas'
    );
  }

  enterPOV(s: ButacaMapa): void {
    const eye = new THREE.Vector3(
      (s as any).x || 0,
      ((s as any).y || 0) + (s.tipo === 'vip' ? 1.75 : 1.9),
      ((s as any).z || 0) + 0.15
    );
    this.povBase.copy(this.screenCenter);
    this.povOffset.set(0, 0);
    this.flyTo(eye, this.screenCenter, { dur: 2.2, arc: 5, pov: true });
    this.setHover(null);
    this.cambioCamara.emit('pov');
  }

  exitPOV(): void {
    this.preset('overview');
  }

  private flyTo(
    pos: THREE.Vector3,
    target: THREE.Vector3,
    { dur = 1.8, arc = 6, pov = false } = {}
  ): void {
    if (!this.controls || !this.camera) return;
    if (this.cameraMode === 'orbit') {
      this.lookTarget.copy(this.controls.target);
    }
    this.controls.enabled = false;
    this.cameraMode = pov ? 'pov' : 'orbit';
    this.fly = {
      p0: this.camera.position.clone(),
      t0: this.lookTarget.clone(),
      p1: pos.clone(),
      t1: target.clone(),
      start: performance.now(),
      dur: dur * 1000,
      arc,
    };
  }

  private init3D(): void {
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
    const DPR = Math.min(
      typeof window !== 'undefined' ? window.devicePixelRatio : 1,
      1.75
    );
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

    let composer: EffectComposer;
    try {
      composer = new EffectComposer(
        renderer,
        new THREE.WebGLRenderTarget(width, height, {
          type: THREE.HalfFloatType,
          samples: 4,
        })
      );
      composer.setPixelRatio(DPR);
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.85,
        0.6,
        0.8
      );
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      this.bloom = bloom;
      this.composer = composer;
    } catch {
      this.composer = null;
    }

    this.buildGeometryAndLighting(scene, camera, DPR, width, height);
    this.setupEvents(canvas);

    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
    });
    this.resizeObserver.observe(parent);

    const frame = () => {
      this.animId = requestAnimationFrame(frame);
      this.renderFrame();
    };
    frame();
  }

  private buildGeometryAndLighting(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    DPR: number,
    w: number,
    h: number
  ): void {
    const SX = 1.62;
    const colX = (c: number) =>
      (c - 15.5) * SX + (c > 5 ? 0.7 : 0) + (c > 26 ? 0.7 : 0) - 0.7;

    const rowInfo: Record<string, { z: number; y: number; d: number }> = {};
    {
      let z = 0;
      let y = 0.25;
      let prevD = 0;
      [...FILAS].reverse().forEach((r, i) => {
        const d = FILAS_VIP.includes(r)
          ? 2.6
          : r === 'K'
            ? 2.8
            : r === 'J'
              ? 2.5
              : 2.05;
        if (i > 0) {
          z += prevD / 2 + d / 2;
          y += FILAS_VIP.includes(r)
            ? 0.32
            : r === 'J'
              ? 0
              : r === 'K'
                ? 0.3
                : 0.45;
        }
        rowInfo[r] = { z, y, d };
        prevD = d;
      });
    }

    const HALL_X = 31;
    const SCREEN = { w: 50, h: 20, y: 13, z: -11, R: 90 };
    const FRONT_Z = -13;
    const BACK_Z = rowInfo['A'].z + rowInfo['A'].d / 2 + 3.5;
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
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_X * 2, BACK_Z - FRONT_Z),
      matCarpet
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (BACK_Z + FRONT_Z) / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Risers y escalones
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
      const { z, y, d } = rowInfo[r];
      const riser = new THREE.Mesh(
        new THREE.BoxGeometry(HALL_X * 2, y, d),
        matRiser
      );
      riser.position.set(0, y / 2, z);
      riser.receiveShadow = true;
      scene.add(riser);

      const top = new THREE.Mesh(
        new THREE.PlaneGeometry(HALL_X * 2, d),
        matCarpet
      );
      top.rotation.x = -Math.PI / 2;
      top.position.set(0, y + 0.005, z);
      top.receiveShadow = true;
      scene.add(top);

      const led = new THREE.Mesh(
        new THREE.BoxGeometry(HALL_X * 2 - 0.2, 0.035, 0.03),
        ledStepMat
      );
      led.position.set(0, y - 0.04, z - d / 2 - 0.02);
      scene.add(led);
    }

    // Paredes y techo
    const matWall = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      color: 0x181922,
    });
    const hallLen = BACK_Z - FRONT_Z;

    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(
        new THREE.PlaneGeometry(hallLen, CEIL),
        matWall
      );
      wall.position.set(side * HALL_X, CEIL / 2, (BACK_Z + FRONT_Z) / 2);
      wall.rotation.y = (-side * Math.PI) / 2;
      scene.add(wall);

      for (const z of [0, 10, 20, 30, 40]) {
        const y = 11.5 + z * 0.08;
        const pl = new THREE.PointLight(0xffa860, 40, 26, 2);
        pl.position.set(side * (HALL_X - 1.5), y, z);
        scene.add(pl);
        this.sconceLights.push(pl);
      }
    }

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(HALL_X * 2, hallLen),
      new THREE.MeshStandardMaterial({ color: 0x07080d, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, CEIL, (BACK_Z + FRONT_Z) / 2);
    scene.add(ceiling);

    // Pantalla de cine
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
      new THREE.CylinderGeometry(
        SCREEN.R,
        SCREEN.R,
        SCREEN.h,
        64,
        1,
        true,
        Math.PI - L / 2,
        L
      ),
      screenMat
    );
    screen.position.set(0, SCREEN.y, SCREEN.z + SCREEN.R);
    scene.add(screen);

    const screenLight = new THREE.RectAreaLight(
      0x8877ff,
      1.4,
      SCREEN.w,
      SCREEN.h
    );
    screenLight.position.set(0, SCREEN.y, SCREEN.z + 1.5);
    screenLight.lookAt(0, 4, 30);
    scene.add(screenLight);
    this.screenLight = screenLight;

    // Iluminación ambiental
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

    // Modelado de butacas
    this.setupButacasMesh(scene, rowInfo, colX);

    scene.add(this.spriteGroup);
  }

  private setupButacasMesh(
    scene: THREE.Scene,
    rowInfo: Record<string, { z: number; y: number; d: number }>,
    colX: (c: number) => number
  ): void {
    const RB = (w: number, h: number, d: number, r: number) =>
      new RoundedBoxGeometry(w, h, d, 2, r);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
    });
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x262831,
      roughness: 0.45,
      metalness: 0.25,
    });

    const LOOK: Record<string, [number, number]> = {
      comun: [0x434857, 0x262831],
      vip: [0x86283a, 0x40121b],
      accesible: [0x2b5fd8, 0x163272],
      ocupada: [0x18191e, 0x101115],
      bloqueada: [0x202128, 0x15161b],
      seleccionada: [0x4a86ff, 0x1f45a8],
    };

    const seats = this.butacas();
    this.seats = seats;
    this.seatById.clear();
    for (const s of seats) {
      this.seatById.set(s.id, s);
      const ri = rowInfo[s.fila];
      if (ri) {
        (s as any).x = colX(s.columna);
        (s as any).y = ri.y;
        (s as any).z = ri.z - 0.1;
      }
    }

    const count = seats.length;
    if (count === 0) return;

    const seatMesh = new THREE.InstancedMesh(
      RB(1.12, 0.95, 0.85, 0.08),
      bodyMat,
      count
    );
    seatMesh.castShadow = true;
    seatMesh.receiveShadow = true;
    seatMesh.userData['seats'] = seats;
    this.pickables = [seatMesh];
    scene.add(seatMesh);

    const _m4 = new THREE.Matrix4();
    const _c = new THREE.Color();

    const updateSeat = (s: ButacaMapa, idx: number) => {
      const lift = (s as any).hover && s.estado === 'disponible' ? 0.14 : 0;
      _m4.makeTranslation(
        (s as any).x || 0,
        ((s as any).y || 0) + 0.48 + lift,
        (s as any).z || 0
      );
      seatMesh.setMatrixAt(idx, _m4);

      const colorKey = s.seleccionada
        ? 'seleccionada'
        : s.estado !== 'disponible'
          ? s.estado
          : s.tipo;
      const cHex = LOOK[colorKey] ? LOOK[colorKey][0] : LOOK['comun'][0];
      _c.setHex(cHex);
      if ((s as any).hover) _c.multiplyScalar(1.4);
      seatMesh.setColorAt(idx, _c);
    };

    this.updateSeatFn = (s: ButacaMapa) => {
      const idx = seats.indexOf(s);
      if (idx >= 0) {
        updateSeat(s, idx);
        seatMesh.instanceMatrix.needsUpdate = true;
        if (seatMesh.instanceColor) seatMesh.instanceColor.needsUpdate = true;
      }
    };

    seats.forEach((s, i) => updateSeat(s, i));
    seatMesh.instanceMatrix.needsUpdate = true;
    if (seatMesh.instanceColor) seatMesh.instanceColor.needsUpdate = true;
  }

  private syncButacas(): void {
    const updated = this.butacas();
    this.seats = updated;
    this.seatById.clear();
    for (const s of updated) {
      this.seatById.set(s.id, s);
      if (this.updateSeatFn) this.updateSeatFn(s);
    }
  }

  private setupEvents(canvas: HTMLCanvasElement): void {
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.cx = e.clientX;
      this.pointer.cy = e.clientY;
      this.pointer.dirty = true;
    };

    const onPointerDown = (e: PointerEvent) => {
      this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (
        !this.downAt ||
        Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 6
      ) {
        return;
      }
      const s = this.pick();
      if (s) {
        if (this.modo() === 'elegir') {
          this.ngZone.run(() => {
            this.butacaClick.emit(s);
          });
        }
      }
    };

    const onDblClick = () => {
      const s = this.pick();
      if (s) {
        this.enterPOV(s);
      }
    };

    const onPointerLeave = () => {
      this.setHover(null);
      this.ngZone.run(() => {
        this.butacaHover.emit({ butaca: null, x: 0, y: 0 });
      });
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('pointerleave', onPointerLeave);

    this.listeners.push(
      () => canvas.removeEventListener('pointermove', onPointerMove),
      () => canvas.removeEventListener('pointerdown', onPointerDown),
      () => canvas.removeEventListener('pointerup', onPointerUp),
      () => canvas.removeEventListener('dblclick', onDblClick),
      () => canvas.removeEventListener('pointerleave', onPointerLeave)
    );
  }

  private pick(): ButacaMapa | null {
    if (!this.camera || this.pickables.length === 0) return null;
    this.raycaster.setFromCamera(
      this.ndc.set(this.pointer.x, this.pointer.y),
      this.camera
    );
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    return hit && hit.instanceId !== undefined
      ? (hit.object.userData['seats']?.[hit.instanceId] ?? null)
      : null;
  }

  private setHover(s: ButacaMapa | null): void {
    if (this.hovered === s) return;
    const prev = this.hovered;
    this.hovered = s;
    if (prev) {
      (prev as any).hover = false;
      if (this.updateSeatFn) this.updateSeatFn(prev);
    }
    if (s) {
      (s as any).hover = true;
      if (this.updateSeatFn) this.updateSeatFn(s);
    }
    const canvas = this.el.nativeElement;
    canvas.style.cursor = s
      ? s.estado === 'disponible'
        ? 'pointer'
        : 'not-allowed'
      : '';
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
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.bloom) {
      this.bloom.resolution.set(width, height);
    }
  }

  private renderFrame(): void {
    if (!this.active || !this.renderer || !this.scene || !this.camera) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = (this.U.uTime.value += dt);

    this.house += (this.houseTarget - this.house) * (1 - Math.exp(-dt * 1.8));
    this.U.uHouse.value = this.house;
    const show = 1 - this.house;

    if (this.screenMat) {
      this.screenMat.uniforms['uPower'].value = 0.85 + show * 0.2;
    }
    if (this.screenLight) {
      this.screenLight.intensity = 1.3 + show * 1.6;
    }
    if (this.hemi) {
      this.hemi.intensity = 0.12 + this.house * 0.45;
    }
    if (this.key) {
      this.key.intensity = 300 + this.house * 2300;
    }
    for (const l of this.sconceLights) {
      l.intensity = 6 + this.house * 34;
    }

    if (this.fly) {
      const k = Math.min(
        (performance.now() - this.fly.start) / this.fly.dur,
        1
      );
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.camera.position.lerpVectors(this.fly.p0, this.fly.p1, e);
      this.camera.position.y += Math.sin(Math.PI * e) * this.fly.arc;
      this.lookTarget.lerpVectors(this.fly.t0, this.fly.t1, e);
      this.camera.lookAt(this.lookTarget);

      if (k >= 1) {
        this.fly = null;
        if (this.cameraMode === 'orbit' && this.controls) {
          this.controls.target.copy(this.lookTarget);
          this.controls.enabled = true;
          this.controls.update();
        }
      }
    } else if (this.cameraMode === 'pov') {
      this.povOffset.x +=
        (this.pointer.x * 16 - this.povOffset.x) * (1 - Math.exp(-dt * 3));
      this.povOffset.y +=
        (this.pointer.y * 7 - this.povOffset.y) * (1 - Math.exp(-dt * 3));
      this.lookTarget.set(
        this.povBase.x + this.povOffset.x,
        this.povBase.y + this.povOffset.y,
        this.povBase.z
      );
      this.camera.lookAt(this.lookTarget);
    } else if (this.controls) {
      this.controls.update();
    }

    if (this.pointer.dirty && !this.fly && this.cameraMode === 'orbit') {
      this.pointer.dirty = false;
      const s = this.pick();
      this.setHover(s);
      this.ngZone.run(() => {
        this.butacaHover.emit({
          butaca: s,
          x: this.pointer.cx,
          y: this.pointer.cy,
        });
      });
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private dispose(): void {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    for (const rm of this.listeners) rm();
    this.listeners = [];

    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }
}

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

type OpcionesVuelo = { dur?: number; arc?: number; pov?: boolean };

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

  private elemento = inject(ElementRef<HTMLCanvasElement>);
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
  private uniformes = {
    uTime: { value: 0 },
    uTint: { value: new THREE.Color(0.4, 0.35, 1) },
    uHouse: { value: 1 },
  };

  private actualizarButaca: ((butaca: ButacaEscena) => void) | null = null;

  ngOnInit(): void {
    if (soportaWebgl()) {
      // El loop de render corre fuera de Angular para no disparar detección de cambios en cada cuadro.
      this.ngZone.runOutsideAngular(() => this.iniciarEscena());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['butacas'] !== undefined && this.actualizarButaca !== null) {
      for (const butaca of this.butacas()) {
        this.actualizarButaca(butaca);
      }
    }

    if (changes['camaraActiva'] !== undefined && changes['camaraActiva'].firstChange === false) {
      this.preset(this.camaraActiva());
    }

    if (changes['modoFuncion'] !== undefined && changes['modoFuncion'].firstChange === false) {
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
    const elegido = presets[name];

    if (elegido !== undefined && this.camera !== null) {
      const posicion = elegido[0];
      const objetivo = elegido[1];

      if (name === 'stage') {
        this.volarA(posicion, objetivo, { arc: 2 });
      } else {
        // En pantallas angostas alejo la cámara para que entre toda la sala.
        const aspect = this.camera.aspect;

        let factor = 1;

        if (aspect < 1.2) {
          factor = Math.min(1.6, 0.9 / aspect);
        }

        const desplazamiento = posicion.clone().sub(objetivo).multiplyScalar(factor);
        const lejos = objetivo.clone().add(desplazamiento);
        this.volarA(lejos, objetivo, { arc: 8 });
      }

      this.cambioCamara.emit(name);
    }
  }

  setModoFuncion(activo: boolean): void {
    this.luzSalaObjetivo = activo ? 0 : 1;
    const mensaje = activo ? 'Modo función: se apagan las luces…' : 'Luces de sala encendidas';
    this.notificacion.emit(mensaje);
  }

  onResize(): void {
    if (this.renderer !== null && this.camera !== null) {
      const canvas = this.elemento.nativeElement;
      const parent = contenedorDe(canvas);
      const width = medidaOPorDefecto(parent.clientWidth, 800);
      const height = medidaOPorDefecto(parent.clientHeight, 600);

      if (width > 0 && height > 0) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);

        if (this.composer !== null) {
          this.composer.setSize(width, height);
        }

        if (this.bloom !== null) {
          this.bloom.resolution.set(width, height);
        }
      }
    }
  }

  // Doble clic sobre una butaca: la cámara va a los ojos de quien se sienta ahí.
  private entrarPOV(butaca: ButacaEscena): void {
    const esVip = butaca.tipo === 'vip';
    const alturaOjos = esVip ? 1.75 : 1.9;
    const eye = new THREE.Vector3(
      coordenada(butaca.x),
      coordenada(butaca.y) + alturaOjos,
      coordenada(butaca.z) + 0.15,
    );
    this.povBase.copy(this.screenCenter);
    this.povOffset.set(0, 0);
    this.volarA(eye, this.screenCenter, { dur: 2.2, arc: 5, pov: true });
    this.resaltar(null);
    this.cambioCamara.emit('pov');
  }

  private volarA(pos: THREE.Vector3, target: THREE.Vector3, opciones: OpcionesVuelo = {}): void {
    let duracion = 1.8;

    if (opciones.dur !== undefined) {
      duracion = opciones.dur;
    }

    let arco = 6;

    if (opciones.arc !== undefined) {
      arco = opciones.arc;
    }

    let esPov = false;

    if (opciones.pov !== undefined) {
      esPov = opciones.pov;
    }

    if (this.controls !== null && this.camera !== null) {
      if (this.modoCamara === 'orbit') {
        this.lookTarget.copy(this.controls.target);
      }

      this.controls.enabled = false;
      this.modoCamara = esPov ? 'pov' : 'orbit';
      this.vuelo = {
        p0: this.camera.position.clone(),
        t0: this.lookTarget.clone(),
        p1: pos.clone(),
        t1: target.clone(),
        start: performance.now(),
        dur: duracion * 1000,
        arc: arco,
      };
    }
  }

  private iniciarEscena(): void {
    const canvas = this.elemento.nativeElement;
    const parent = contenedorDe(canvas);
    const width = medidaOPorDefecto(parent.clientWidth, 800);
    const height = medidaOPorDefecto(parent.clientHeight, 600);

    let renderer: THREE.WebGLRenderer | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      renderer = null;
    }

    if (renderer !== null) {
      this.montarEscena(renderer, canvas, parent, width, height);
    }
  }

  private montarEscena(
    renderer: THREE.WebGLRenderer,
    canvas: HTMLCanvasElement,
    parent: HTMLElement,
    width: number,
    height: number,
  ): void {
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
      const destino = new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        samples: 4,
      });
      const composer = new EffectComposer(renderer, destino);
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

    this.cuadro();
  }

  private cuadro(): void {
    this.idAnimacion = requestAnimationFrame(() => this.cuadro());
    this.dibujarCuadro();
  }

  private armarSala(scene: THREE.Scene): void {
    const SX = 1.62;

    function colX(columna: number): number {
      let pasaPrimerPasillo = false;

      if (columna > 5) {
        pasaPrimerPasillo = true;
      }

      let pasaSegundoPasillo = false;

      if (columna > 26) {
        pasaSegundoPasillo = true;
      }

      const corrimientoPrimero = pasaPrimerPasillo ? 0.7 : 0;
      const corrimientoSegundo = pasaSegundoPasillo ? 0.7 : 0;
      const posicionX = (columna - 15.5) * SX + corrimientoPrimero + corrimientoSegundo - 0.7;

      return posicionX;
    }

    // Profundidad (d), altura (y) y posición (z) de cada fila, de atrás (T) hacia adelante (A).
    const filas3d: Record<string, Fila3d> = {};
    const filasInvertidas = [...FILAS].reverse();
    let posicionZ = 0;
    let altura = 0.25;
    let profundidadAnterior = 0;

    for (let indice = 0; indice < filasInvertidas.length; indice++) {
      const nombreFila = filasInvertidas[indice];
      const esVip = FILAS_VIP.includes(nombreFila);

      let profundidad = 2.05;

      if (esVip) {
        profundidad = 2.6;
      } else if (nombreFila === 'K') {
        profundidad = 2.8;
      } else if (nombreFila === 'J') {
        profundidad = 2.5;
      }

      if (indice > 0) {
        posicionZ += profundidadAnterior / 2 + profundidad / 2;

        // La J (accesible) queda a la misma altura que la K, sin escalón.
        if (esVip) {
          altura += 0.32;
        } else if (nombreFila === 'K') {
          altura += 0.3;
        } else if (nombreFila !== 'J') {
          altura += 0.45;
        }
      }

      filas3d[nombreFila] = { z: posicionZ, y: altura, d: profundidad };
      profundidadAnterior = profundidad;
    }

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
    const floorGeometria = new THREE.PlaneGeometry(HALL_X * 2, BACK_Z - FRONT_Z);
    const floor = new THREE.Mesh(floorGeometria, matCarpet);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (BACK_Z + FRONT_Z) / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Escalones con la tira de LED que late en los pasillos.
    const ledStepMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniformes,
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

    for (const nombreFila of FILAS) {
      const fila = filas3d[nombreFila];

      const riserGeometria = new THREE.BoxGeometry(HALL_X * 2, fila.y, fila.d);
      const riser = new THREE.Mesh(riserGeometria, matRiser);
      riser.position.set(0, fila.y / 2, fila.z);
      riser.receiveShadow = true;
      scene.add(riser);

      const topGeometria = new THREE.PlaneGeometry(HALL_X * 2, fila.d);
      const top = new THREE.Mesh(topGeometria, matCarpet);
      top.rotation.x = -Math.PI / 2;
      top.position.set(0, fila.y + 0.005, fila.z);
      top.receiveShadow = true;
      scene.add(top);

      const ledGeometria = new THREE.BoxGeometry(HALL_X * 2 - 0.2, 0.035, 0.03);
      const led = new THREE.Mesh(ledGeometria, ledStepMat);
      led.position.set(0, fila.y - 0.04, fila.z - fila.d / 2 - 0.02);
      scene.add(led);
    }

    // Paredes con apliques y techo.
    const matWall = new THREE.MeshStandardMaterial({
      roughness: 0.9,
      color: 0x181922,
    });
    const hallLen = BACK_Z - FRONT_Z;

    for (const lado of [-1, 1]) {
      const wallGeometria = new THREE.PlaneGeometry(hallLen, CEIL);
      const wall = new THREE.Mesh(wallGeometria, matWall);
      wall.position.set(lado * HALL_X, CEIL / 2, (BACK_Z + FRONT_Z) / 2);
      wall.rotation.y = (-lado * Math.PI) / 2;
      scene.add(wall);

      for (const apliqueZ of [0, 10, 20, 30, 40]) {
        const apliqueY = 11.5 + apliqueZ * 0.08;
        const aplique = new THREE.PointLight(0xffa860, 40, 26, 2);
        aplique.position.set(lado * (HALL_X - 1.5), apliqueY, apliqueZ);
        scene.add(aplique);
        this.apliques.push(aplique);
      }
    }

    const ceilingGeometria = new THREE.PlaneGeometry(HALL_X * 2, hallLen);
    const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x07080d, roughness: 1 });
    const ceiling = new THREE.Mesh(ceilingGeometria, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, CEIL, (BACK_Z + FRONT_Z) / 2);
    scene.add(ceiling);

    // Pantalla curva.
    const screenMat = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniformes,
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
    const screenGeometria = new THREE.CylinderGeometry(
      SCREEN.R,
      SCREEN.R,
      SCREEN.h,
      64,
      1,
      true,
      Math.PI - L / 2,
      L,
    );
    const screen = new THREE.Mesh(screenGeometria, screenMat);
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
    colX: (columna: number) => number,
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

    for (const butaca of seats) {
      const fila = filas3d[butaca.fila];

      if (fila !== undefined) {
        butaca.x = colX(butaca.columna);
        butaca.y = fila.y;
        butaca.z = fila.z - 0.1;
      }
    }

    if (seats.length !== 0) {
      const seatGeometria = new RoundedBoxGeometry(1.12, 0.95, 0.85, 2, 0.08);
      const seatMesh = new THREE.InstancedMesh(seatGeometria, bodyMat, seats.length);
      seatMesh.castShadow = true;
      seatMesh.receiveShadow = true;
      seatMesh.userData['seats'] = seats;
      this.seleccionables = [seatMesh];
      scene.add(seatMesh);

      const matriz = new THREE.Matrix4();
      const color = new THREE.Color();

      function pintar(butaca: ButacaEscena, indice: number): void {
        let levantada = false;

        if (butaca.hover === true && butaca.estado === 'disponible') {
          levantada = true;
        }

        const lift = levantada ? 0.14 : 0;
        matriz.makeTranslation(
          coordenada(butaca.x),
          coordenada(butaca.y) + 0.48 + lift,
          coordenada(butaca.z),
        );
        seatMesh.setMatrixAt(indice, matriz);

        let clave: string = butaca.tipo;

        if (butaca.seleccionada) {
          clave = 'seleccionada';
        } else if (butaca.estado !== 'disponible') {
          clave = butaca.estado;
        }

        let colorHex = colores['comun'];
        const encontrado = colores[clave];

        if (encontrado !== undefined && encontrado !== null) {
          colorHex = encontrado;
        }

        color.setHex(colorHex);

        if (butaca.hover === true) {
          color.multiplyScalar(1.4);
        }

        seatMesh.setColorAt(indice, color);
      }

      this.actualizarButaca = (butaca: ButacaEscena) => {
        const indice = seats.indexOf(butaca);

        if (indice >= 0) {
          pintar(butaca, indice);
          seatMesh.instanceMatrix.needsUpdate = true;

          if (seatMesh.instanceColor !== null) {
            seatMesh.instanceColor.needsUpdate = true;
          }
        }
      };

      for (let indice = 0; indice < seats.length; indice++) {
        pintar(seats[indice], indice);
      }

      seatMesh.instanceMatrix.needsUpdate = true;

      if (seatMesh.instanceColor !== null) {
        seatMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private escucharEventos(canvas: HTMLCanvasElement): void {
    const alMover = (evento: PointerEvent) => this.alMover(evento, canvas);
    const alPresionar = (evento: PointerEvent) => this.alPresionar(evento);
    const alSoltar = (evento: PointerEvent) => this.alSoltar(evento);
    const alDobleClic = () => this.alDobleClic();
    const alSalir = () => this.alSalir();

    canvas.addEventListener('pointermove', alMover);
    canvas.addEventListener('pointerdown', alPresionar);
    canvas.addEventListener('pointerup', alSoltar);
    canvas.addEventListener('dblclick', alDobleClic);
    canvas.addEventListener('pointerleave', alSalir);

    const quitarMover = () => canvas.removeEventListener('pointermove', alMover);
    const quitarPresionar = () => canvas.removeEventListener('pointerdown', alPresionar);
    const quitarSoltar = () => canvas.removeEventListener('pointerup', alSoltar);
    const quitarDobleClic = () => canvas.removeEventListener('dblclick', alDobleClic);
    const quitarSalir = () => canvas.removeEventListener('pointerleave', alSalir);

    this.quitarEventos.push(
      quitarMover,
      quitarPresionar,
      quitarSoltar,
      quitarDobleClic,
      quitarSalir,
    );
  }

  private alMover(evento: PointerEvent, canvas: HTMLCanvasElement): void {
    const rect = canvas.getBoundingClientRect();
    this.puntero.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    this.puntero.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
    this.puntero.cx = evento.clientX;
    this.puntero.cy = evento.clientY;
    this.puntero.movido = true;
  }

  private alPresionar(evento: PointerEvent): void {
    this.inicioToque = { x: evento.clientX, y: evento.clientY };
  }

  // Si el puntero se movió más de 6px entre presionar y soltar, fue un arrastre de la cámara.
  private alSoltar(evento: PointerEvent): void {
    if (this.inicioToque !== null) {
      const distancia = Math.hypot(
        evento.clientX - this.inicioToque.x,
        evento.clientY - this.inicioToque.y,
      );

      if (distancia <= 6) {
        const butaca = this.butacaBajoPuntero();

        if (butaca !== null && this.modo() === 'elegir') {
          this.ngZone.run(() => this.butacaClick.emit(butaca));
        }
      }
    }
  }

  private alDobleClic(): void {
    const butaca = this.butacaBajoPuntero();

    if (butaca !== null) {
      this.entrarPOV(butaca);
    }
  }

  private alSalir(): void {
    this.resaltar(null);
    this.ngZone.run(() => this.butacaHover.emit({ butaca: null, x: 0, y: 0 }));
  }

  private butacaBajoPuntero(): ButacaEscena | null {
    let bandera: ButacaEscena | null = null;

    if (this.camera !== null && this.seleccionables.length !== 0) {
      const coordenadas = this.ndc.set(this.puntero.x, this.puntero.y);
      this.raycaster.setFromCamera(coordenadas, this.camera);
      const impactos = this.raycaster.intersectObjects(this.seleccionables, false);
      const impacto = impactos[0];

      if (impacto !== undefined && impacto.instanceId !== undefined) {
        const butacas = impacto.object.userData['seats'];

        if (butacas !== undefined && butacas !== null) {
          const butaca = butacas[impacto.instanceId];

          if (butaca !== undefined && butaca !== null) {
            bandera = butaca;
          }
        }
      }
    }

    return bandera;
  }

  private resaltar(butaca: ButacaEscena | null): void {
    if (this.resaltada !== butaca) {
      const anterior = this.resaltada;
      this.resaltada = butaca;

      if (anterior !== null) {
        anterior.hover = false;

        if (this.actualizarButaca !== null) {
          this.actualizarButaca(anterior);
        }
      }

      let cursor = '';

      if (butaca !== null) {
        butaca.hover = true;

        if (this.actualizarButaca !== null) {
          this.actualizarButaca(butaca);
        }

        if (butaca.estado === 'disponible') {
          cursor = 'pointer';
        } else {
          cursor = 'not-allowed';
        }
      }

      this.elemento.nativeElement.style.cursor = cursor;
    }
  }

  private dibujarCuadro(): void {
    if (this.renderer !== null && this.scene !== null && this.camera !== null) {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.uniformes.uTime.value += dt;

      this.luzSala += (this.luzSalaObjetivo - this.luzSala) * (1 - Math.exp(-dt * 1.8));
      this.uniformes.uHouse.value = this.luzSala;
      const show = 1 - this.luzSala;

      if (this.screenMat !== null) {
        this.screenMat.uniforms['uPower'].value = 0.85 + show * 0.2;
      }

      if (this.screenLight !== null) {
        this.screenLight.intensity = 1.3 + show * 1.6;
      }

      if (this.hemi !== null) {
        this.hemi.intensity = 0.12 + this.luzSala * 0.45;
      }

      if (this.key !== null) {
        this.key.intensity = 300 + this.luzSala * 2300;
      }

      for (const aplique of this.apliques) {
        aplique.intensity = 6 + this.luzSala * 34;
      }

      if (this.vuelo !== null) {
        const avance = Math.min((performance.now() - this.vuelo.start) / this.vuelo.dur, 1);

        let suavizado: number;

        if (avance < 0.5) {
          suavizado = 4 * avance * avance * avance;
        } else {
          suavizado = 1 - Math.pow(-2 * avance + 2, 3) / 2;
        }

        this.camera.position.lerpVectors(this.vuelo.p0, this.vuelo.p1, suavizado);
        this.camera.position.y += Math.sin(Math.PI * suavizado) * this.vuelo.arc;
        this.lookTarget.lerpVectors(this.vuelo.t0, this.vuelo.t1, suavizado);
        this.camera.lookAt(this.lookTarget);

        if (avance >= 1) {
          this.vuelo = null;

          if (this.modoCamara === 'orbit' && this.controls !== null) {
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
      } else if (this.controls !== null) {
        this.controls.update();
      }

      if (this.puntero.movido && this.vuelo === null && this.modoCamara === 'orbit') {
        this.puntero.movido = false;
        const butaca = this.butacaBajoPuntero();
        this.resaltar(butaca);
        this.ngZone.run(() => this.emitirHover(butaca));
      }

      if (this.composer !== null) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  private emitirHover(butaca: ButacaEscena | null): void {
    this.butacaHover.emit({ butaca: butaca, x: this.puntero.cx, y: this.puntero.cy });
  }

  private liberarRecursos(): void {
    if (this.idAnimacion !== null) {
      cancelAnimationFrame(this.idAnimacion);
      this.idAnimacion = null;
    }

    if (this.observadorTamanio !== null) {
      this.observadorTamanio.disconnect();
    }

    this.observadorTamanio = null;

    for (const quitar of this.quitarEventos) {
      quitar();
    }

    this.quitarEventos = [];

    if (this.controls !== null) {
      this.controls.dispose();
    }

    this.controls = null;

    if (this.composer !== null) {
      this.composer.dispose();
    }

    this.composer = null;

    if (this.renderer !== null) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------

function contenedorDe(canvas: HTMLCanvasElement): HTMLElement {
  let contenedor: HTMLElement = canvas;

  if (canvas.parentElement !== null) {
    contenedor = canvas.parentElement;
  }

  return contenedor;
}

function medidaOPorDefecto(medida: number, porDefecto: number): number {
  let bandera = porDefecto;

  if (medida !== 0) {
    bandera = medida;
  }

  return bandera;
}

function coordenada(valor: number | undefined): number {
  let bandera = 0;

  if (valor !== undefined) {
    bandera = valor;
  }

  return bandera;
}

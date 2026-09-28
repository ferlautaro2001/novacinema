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
import { ButacaMapa, FILAS, FILAS_VIP, PASILLOS, TOTAL_COLUMNAS } from './distribucion';
import { soportaWebgl } from '../../directivas/si-webgl';

// A cada butaca le guardo su posición en la escena, si tiene el puntero encima y las
// piezas de Three.js que la dibujan. El id es la clave: el componente arma un objeto
// nuevo por cada cambio, así que no se puede comparar por identidad.
type ButacaEscena = ButacaMapa & {
  x: number;
  y: number;
  z: number;
  indice: number;
  hover: boolean;
  partes: PiezaButaca[];
  sprite: THREE.Sprite | null;
};

type Fila3d = { z: number; y: number; d: number };

type OpcionesVuelo = { dur?: number; arc?: number; pov?: boolean };

type PosicionLocal = { p: [number, number, number]; r: number };

// Cómo se dibuja una pieza de butaca: una geometría repetida muchas veces, en una
// posición local dentro de la butaca.
type DefPieza = {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  color: 'cuerpo' | 'brazos';
  glow?: boolean;
  pick?: boolean;
  shadow?: boolean;
  locales: PosicionLocal[];
};

// Una pieza ya montada: la malla instanciada y sus transformadas locales.
type PiezaButaca = {
  malla: THREE.InstancedMesh;
  locales: THREE.Matrix4[];
  def: DefPieza;
};

type AroSeleccion = { malla: THREE.Mesh; nacimiento: number };

type OpcionesSprite = {
  tamano?: number;
  color?: string;
  fuente?: string;
  peso?: string;
  halo?: string;
  ancho?: number;
};

type EstiloIcono = {
  fondo?: string;
  trazo: string;
  halo?: string;
  borde?: string;
};

type Paleta = { cuerpo: THREE.Color; brazos: THREE.Color };

// El navegador escribe letterSpacing en el contexto 2D, pero los tipos de
// TypeScript todavía no lo declaran.
type Contexto2d = CanvasRenderingContext2D & { letterSpacing: string };

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
  // El mapa arranca en 2D: con la vista 3D oculta no tiene sentido seguir dibujando.
  activo = input<boolean>(true);

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

  private reloj = new THREE.Clock();
  private dpr = 1;
  private introHecha = false;

  // 1 = luces de sala prendidas, 0 = apagadas (modo función). luzSala va hacia el objetivo.
  private luzSalaObjetivo = 1;
  private luzSala = 1;

  // Medidas de la sala. Son las mismas que usa seatmap.html.
  private readonly separacionX = 1.62;
  private readonly anchoX = 31;
  private readonly alto = 30;
  private readonly frenteZ = -13;
  private readonly pantalla = { w: 50, h: 20, y: 13, z: -11, r: 90 };
  private filas3d: Record<string, Fila3d> = {};
  private pasillosX: number[] = [];
  private fondoZ = 0;
  private largoSala = 0;
  private centroZ = 0;

  // Piezas de la sala que el bucle de render tiene que cambiar de intensidad.
  private apliques: THREE.PointLight[] = [];
  private cortinas: THREE.Mesh[] = [];
  private aletas: THREE.InstancedMesh | null = null;
  private estrellas: THREE.Points | null = null;
  private grupoSprites: THREE.Group | null = null;
  private etiquetasFila: THREE.Sprite[] = [];
  private pantallaMat: THREE.ShaderMaterial | null = null;
  private hazMat: THREE.ShaderMaterial | null = null;
  private polvoMat: THREE.ShaderMaterial | null = null;
  private aroMat: THREE.MeshBasicMaterial | null = null;
  private geoAro: THREE.BufferGeometry | null = null;
  private luzPantalla: THREE.RectAreaLight | null = null;
  private hemi: THREE.HemisphereLight | null = null;
  private key: THREE.SpotLight | null = null;
  private iconosMat: Record<string, THREE.SpriteMaterial> = {};

  // Butacas: la lista que los modelos de Three.js dibujan y el bucle actualiza.
  private butacasEscena: ButacaEscena[] = [];
  private porId = new Map<string, ButacaEscena>();
  private seleccionables: THREE.InstancedMesh[] = [];
  private silCuerpo: THREE.InstancedMesh | null = null;
  private silCabeza: THREE.InstancedMesh | null = null;
  private aros = new Map<string, AroSeleccion>();

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
  private lookTarget = new THREE.Vector3(0, 5, 14);
  private screenCenter = new THREE.Vector3(0, 12.5, -11);

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private puntero = { x: 0, y: 0, cx: 0, cy: 0, movido: false };
  private resaltada: ButacaEscena | null = null;
  private inicioToque: { x: number; y: number } | null = null;

  // Uniforms compartidos por los shaders de la sala. Los reciben todos por
  // referencia, así que cambiar uno los cambia a todos.
  private compartidos = {
    uTime: { value: 0 },
    uTint: { value: new THREE.Color('#f5c542') },
    uHouse: { value: 1 },
    uPower: { value: 1 },
  };

  // Tintes que va tomando la pantalla. El mismo color llega a la pantalla, al halo,
  // a la luz real y a la cornisa. Son los de la marca, para que la sala se vea
  // NovaCinema y no un cine cualquiera.
  private tintes = [
    new THREE.Color('#f5c542'),
    new THREE.Color('#f0434f'),
    new THREE.Color('#a8121d'),
    new THREE.Color('#e8a33a'),
  ];

  private refrescar = () => {
    this.pintarTodas();
  };

  ngOnInit(): void {
    if (soportaWebgl()) {
      // El loop de render corre fuera de Angular para no disparar detección de cambios en cada cuadro.
      this.ngZone.runOutsideAngular(() => this.iniciarEscena());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['butacas'] !== undefined) {
      this.refrescar();
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

  // ─── API pública ───────────────────────────────────────────────────

  preset(name: string): void {
    const presets: Record<string, [THREE.Vector3, THREE.Vector3]> = {
      overview: [new THREE.Vector3(0, 33, 76), new THREE.Vector3(0, 5, 12)],
      top: [new THREE.Vector3(0, 86, 34), new THREE.Vector3(0, 0, 20)],
      side: [new THREE.Vector3(-58, 24, 36), new THREE.Vector3(0, 5, 14)],
      stage: [new THREE.Vector3(0, 7, -6), new THREE.Vector3(0, 7, 30)],
    };
    const elegido = presets[name];

    if (elegido === undefined || this.camera === null) {
      return;
    }

    const posicion = elegido[0];
    const objetivo = elegido[1];

    if (name === 'stage') {
      this.volarA(posicion, objetivo, { arc: 2 });
    } else {
      // En pantallas angostas alejo la cámara para que entre toda la sala.
      const lejos = this.ajustarAAncho(posicion, objetivo);

      this.volarA(lejos, objetivo, { arc: 8 });
    }

    this.cambioCamara.emit(name);
  }

  setModoFuncion(activo: boolean): void {
    this.luzSalaObjetivo = activo ? 0 : 1;
    const mensaje = activo ? 'Modo función: se apagan las luces…' : 'Luces de sala encendidas';
    this.notificacion.emit(mensaje);
  }

  onResize(): void {
    if (this.renderer === null || this.camera === null) {
      return;
    }

    const canvas = this.elemento.nativeElement;
    const parent = contenedorDe(canvas);
    const width = medidaOPorDefecto(parent.clientWidth, 800);
    const height = medidaOPorDefecto(parent.clientHeight, 600);

    if (width === 0 || height === 0) {
      return;
    }

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

  // ─── Armado de la escena ───────────────────────────────────────────

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
      this.montarEscena(renderer, parent, width, height);
    }
  }

  private montarEscena(
    renderer: THREE.WebGLRenderer,
    parent: HTMLElement,
    width: number,
    height: number,
  ): void {
    this.renderer = renderer;
    this.dpr = Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(this.dpr);
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    try {
      RectAreaLightUniformsLib.init();
    } catch {}

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0608);
    scene.fog = new THREE.FogExp2(0x0b0608, 0.0065);
    this.scene = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.05, 400);
    camera.position.set(0, 70, 150);
    this.camera = camera;

    const canvas = this.elemento.nativeElement;
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 190;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0, 5, 14);
    controls.enabled = false;
    this.controls = controls;
    this.lookTarget.copy(controls.target);

    // Si el post-procesado falla, dibujo directo con el renderer.
    try {
      const destino = new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        samples: 4,
      });
      const composer = new EffectComposer(renderer, destino);
      composer.setPixelRatio(this.dpr);
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

  // Calcula la profundidad, la altura y el ancho de cada fila, de atrás (T) hacia
  // adelante (A). Las gradas suben hacia el fondo: la K tiene su escalón y la J
  // (accesible) no levanta el piso.
  private calcularFilas(): void {
    const filas: Record<string, Fila3d> = {};
    const invertidas = [...FILAS].reverse();
    let posicionZ = 0;
    let altura = 0.25;
    let profundidadAnterior = 0;

    for (let indice = 0; indice < invertidas.length; indice++) {
      const nombreFila = invertidas[indice];
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

        if (esVip) {
          altura += 0.32;
        } else if (nombreFila === 'K') {
          altura += 0.3;
        } else if (nombreFila !== 'J') {
          altura += 0.45;
        }
      }

      const fila: Fila3d = { z: posicionZ, y: altura, d: profundidad };

      filas[nombreFila] = fila;
      profundidadAnterior = profundidad;
    }

    this.filas3d = filas;
  }

  // Centro de la butaca de una columna, con el corrimiento de los dos pasillos.
  private columnaX(columna: number): number {
    let pasaPrimerPasillo = false;
    let pasaSegundoPasillo = false;

    if (columna > 5) {
      pasaPrimerPasillo = true;
    }

    if (columna > 26) {
      pasaSegundoPasillo = true;
    }

    const corrimientoPrimero = pasaPrimerPasillo ? 0.7 : 0;
    const corrimientoSegundo = pasaSegundoPasillo ? 0.7 : 0;
    const posicionX =
      (columna - 15.5) * this.separacionX + corrimientoPrimero + corrimientoSegundo - 0.7;

    return posicionX;
  }

  private armarSala(scene: THREE.Scene): void {
    this.calcularFilas();

    const filaA = this.filas3d['A'];

    this.pasillosX = [this.columnaX(5), this.columnaX(26), -28.5, 28.5];
    this.fondoZ = filaA.z + filaA.d / 2 + 3.5;
    this.largoSala = this.fondoZ - this.frenteZ;
    this.centroZ = (this.fondoZ + this.frenteZ) / 2;

    const texturas = this.crearTexturas();

    this.armarPisoYGradas(scene, texturas);
    this.armarFilasMarcadas(scene, texturas);
    this.armarParedes(scene, texturas);
    this.armarTechoEstrellado(scene);
    this.armarEscenarioYPantalla(scene, texturas);
    this.armarCortinas(scene);
    this.armarProyector(scene);
    this.armarLuces(scene);
    this.armarButacas(scene);
    this.armarEtiquetas(scene);
  }

  // Las texturas se dibujan con un canvas 2D: el ruido de la alfombra, los paneles
  // de la pared, las franjas de la fila K y el cartel de la pantalla.
  private crearTexturas(): Record<string, THREE.CanvasTexture> {
    const texturas: Record<string, THREE.CanvasTexture> = {};

    texturas['alfombra'] = texturaDeLienzo(
      256,
      256,
      (g) => {
        g.fillStyle = '#14090b';
        g.fillRect(0, 0, 256, 256);
        const img = g.getImageData(0, 0, 256, 256);

        for (let i = 0; i < img.data.length; i += 4) {
          const ruido = (Math.random() - 0.5) * 14;
          img.data[i] += ruido;
          img.data[i + 1] += ruido;
          img.data[i + 2] += ruido + 2;
        }

        g.putImageData(img, 0, 0);
        g.strokeStyle = 'rgba(245,197,66,.07)';
        g.lineWidth = 2;

        for (let i = 0; i < 4; i++) {
          g.beginPath();
          g.arc(64 + (i % 2) * 128, 64 + (i >> 1) * 128, 40, 0, 7);
          g.stroke();
        }
      },
      [14, 14],
    );

    texturas['pared'] = texturaDeLienzo(
      512,
      256,
      (g) => {
        g.fillStyle = '#14090b';
        g.fillRect(0, 0, 512, 256);

        for (let x = 0; x < 512; x += 64) {
          const grad = g.createLinearGradient(x, 0, x + 64, 0);
          grad.addColorStop(0, '#1f1013');
          grad.addColorStop(0.5, '#2b181c');
          grad.addColorStop(1, '#1a0f11');
          g.fillStyle = grad;
          g.fillRect(x + 2, 0, 60, 256);
          g.fillStyle = '#07080c';
          g.fillRect(x, 0, 2, 256);
        }

        for (let y = 0; y < 256; y += 3) {
          g.fillStyle = `rgba(255,244,228,${Math.random() * 0.012})`;
          g.fillRect(0, y, 512, 1);
        }
      },
      [6, 1],
    );

    texturas['filaK'] = texturaDeLienzo(2048, 64, (g) => {
      for (let x = -64; x < 2048 + 64; x += 28) {
        g.fillStyle = (x / 28) % 2 ? '#2b181c' : '#1f1013';
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + 14, 0);
        g.lineTo(x + 14 - 64, 64);
        g.lineTo(x - 64, 64);
        g.fill();
      }

      g.fillStyle = '#1f1013';
      g.fillRect(1024 - 330, 8, 660, 48);
      g.font = `600 30px ${FUENTE_CUERPO}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.letterSpacing = '10px';
      g.fillStyle = '#9a8478';
      g.fillText('FILA K · CIRCULACIÓN', 1024, 33);
    });

    texturas['titulo'] = texturaDeTitulo();

    return texturas;
  }

  private armarPisoYGradas(scene: THREE.Scene, texturas: Record<string, THREE.CanvasTexture>): void {
    const ancho = this.anchoX;
    const largo = this.largoSala;

    const matAlfombra = new THREE.MeshStandardMaterial({
      map: texturas['alfombra'],
      roughness: 0.95,
      color: 0xd8c8b8,
    });
    const matGrada = new THREE.MeshStandardMaterial({
      color: 0x1f1013,
      roughness: 0.85,
    });

    const geoPiso = new THREE.PlaneGeometry(ancho * 2, largo);
    const piso = new THREE.Mesh(geoPiso, matAlfombra);
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(0, 0, this.centroZ);
    piso.receiveShadow = true;
    scene.add(piso);

    // Tira LED del borde de cada escalón, con el brillo concentrado en los pasillos.
    const matLed = new THREE.ShaderMaterial({
      uniforms: {
        ...this.compartidos,
        uPasillos: { value: this.pasillosX },
        uColor: { value: colorDePantalla() },
      },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        uniform float uTime, uHouse; uniform vec3 uColor; uniform float uPasillos[4]; varying vec3 vW;
        void main(){
          float peaks = 0.;
          for(int i=0;i<4;i++) peaks += exp(-abs(vW.x-uPasillos[i])*1.4);
          float wave = exp(-pow(abs(abs(vW.x) - mod(uTime*10. + vW.z*0.9, 70.)), 2.)*0.06);
          float lvl = mix(1.35, 0.8, uHouse);
          vec3 c = uColor * (0.22 + peaks*1.8 + wave*1.1) * lvl;
          gl_FragColor = vec4(c, 1.);
        }`,
    });

    // Guías de luz en el piso de los pasillos.
    const matGuia = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#f5c542').multiplyScalar(2.6),
    });
    const guias = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.5, 0.06, 0.06),
      matGuia,
      FILAS.length * 4,
    );
    const matrizGuia = new THREE.Matrix4();
    let indiceGuia = 0;

    for (const nombreFila of FILAS) {
      const fila = this.filas3d[nombreFila];

      const geoGrada = new THREE.BoxGeometry(ancho * 2, fila.y, fila.d);
      const grada = new THREE.Mesh(geoGrada, matGrada);
      grada.position.set(0, fila.y / 2, fila.z);
      grada.receiveShadow = true;
      scene.add(grada);

      const geoTope = new THREE.PlaneGeometry(ancho * 2, fila.d);
      const tope = new THREE.Mesh(geoTope, matAlfombra);
      tope.rotation.x = -Math.PI / 2;
      tope.position.set(0, fila.y + 0.005, fila.z);
      tope.receiveShadow = true;
      scene.add(tope);

      const geoLed = new THREE.BoxGeometry(ancho * 2 - 0.2, 0.035, 0.03);
      const led = new THREE.Mesh(geoLed, matLed);
      led.position.set(0, fila.y - 0.04, fila.z - fila.d / 2 - 0.02);
      scene.add(led);

      for (const pasilloX of this.pasillosX) {
        matrizGuia.makeTranslation(pasilloX, fila.y - 0.14, fila.z - fila.d / 2 - 0.03);
        guias.setMatrixAt(indiceGuia, matrizGuia);
        indiceGuia += 1;
      }
    }

    guias.instanceMatrix.needsUpdate = true;
    scene.add(guias);

    // Plataforma trasera, detrás de la fila A.
    const filaA = this.filas3d['A'];
    const inicio = filaA.z + filaA.d / 2;
    const largoFondo = this.fondoZ - inicio;
    const geoFondo = new THREE.BoxGeometry(ancho * 2, filaA.y, largoFondo);
    const fondo = new THREE.Mesh(geoFondo, matGrada);
    fondo.position.set(0, filaA.y / 2, inicio + largoFondo / 2);
    fondo.receiveShadow = true;
    scene.add(fondo);
  }

  // La fila K se marca con franjas y un texto en el piso; la J, con un contorno azul
  // luminoso que la marca como accesible.
  private armarFilasMarcadas(scene: THREE.Scene, texturas: Record<string, THREE.CanvasTexture>): void {
    const ancho = this.columnaX(TOTAL_COLUMNAS) - this.columnaX(1) + 1.6;
    const filaK = this.filas3d['K'];

    const geoK = new THREE.PlaneGeometry(ancho, 1.25);
    const matK = new THREE.MeshStandardMaterial({
      map: texturas['filaK'],
      roughness: 0.8,
      emissive: 0xffffff,
      emissiveMap: texturas['filaK'],
      emissiveIntensity: 0.12,
    });
    const marcaK = new THREE.Mesh(geoK, matK);
    marcaK.rotation.x = -Math.PI / 2;
    marcaK.position.set(0, filaK.y + 0.02, filaK.z);
    marcaK.receiveShadow = true;
    scene.add(marcaK);

    const filaJ = this.filas3d['J'];
    const anchoJ = this.columnaX(TOTAL_COLUMNAS) - this.columnaX(1) + 4.5;
    const fondoJ = filaJ.d - 0.4;
    const matContorno = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#4fa3e0').multiplyScalar(2.2),
    });
    const bordes: number[][] = [
      [0, -fondoJ / 2, anchoJ, 0.05],
      [0, fondoJ / 2, anchoJ, 0.05],
      [-anchoJ / 2, 0, 0.05, fondoJ],
      [anchoJ / 2, 0, 0.05, fondoJ],
    ];

    for (const borde of bordes) {
      const x = borde[0];
      const z = borde[1];
      const anchoBorde = borde[2];
      const altoBorde = borde[3];

      const geo = new THREE.BoxGeometry(anchoBorde, 0.03, altoBorde);
      const mesh = new THREE.Mesh(geo, matContorno);
      mesh.position.set(x, filaJ.y + 0.03, filaJ.z + z);
      scene.add(mesh);
    }
  }

  private armarParedes(scene: THREE.Scene, texturas: Record<string, THREE.CanvasTexture>): void {
    const ancho = this.anchoX;
    const alto = this.alto;
    const largo = this.largoSala;
    const centro = this.centroZ;

    const matPared = new THREE.MeshStandardMaterial({
      map: texturas['pared'],
      roughness: 0.9,
      color: 0xe6d6c6,
    });

    // Haz de luz que sube y baja de cada aplique de pared.
    const matHaz = new THREE.ShaderMaterial({
      uniforms: {
        ...this.compartidos,
        uColor: { value: new THREE.Color('#f5c542') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uHouse; varying vec2 vUv;
        void main(){
          vec2 p = vUv - 0.5; p.x *= 0.3;
          float dy = abs(p.y);
          float wdt = 0.012 + dy*0.28;
          float cone = 1.0 - smoothstep(wdt*0.15, wdt, abs(p.x));
          float fall = exp(-dy*4.2);
          float core = exp(-length(p)*30.);
          float a = (cone*fall*0.55 + core*1.2) * (0.25 + 0.75*uHouse);
          gl_FragColor = vec4(uColor*a, 1.);
        }`,
    });

    // Cornisa que toma el color de la película, arriba y abajo de la pared.
    const matCornisa = new THREE.ShaderMaterial({
      uniforms: { ...this.compartidos },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        uniform float uTime, uHouse; uniform vec3 uTint; varying vec3 vW;
        void main(){
          float flow = 0.55 + 0.45*sin(vW.z*0.35 - uTime*1.6);
          gl_FragColor = vec4(uTint * (1.2 + flow*1.4) * mix(1.4, 0.9, uHouse), 1.);
        }`,
    });

    // Aletas acústicas verticales de las paredes laterales.
    const geoAleta = new THREE.BoxGeometry(0.35, 21, 1.1);
    const matAleta = new THREE.MeshStandardMaterial({
      color: 0x2b181c,
      roughness: 0.6,
      metalness: 0.3,
    });
    const cantidadAletas = Math.floor(largo / 4.2);
    const aletas = new THREE.InstancedMesh(geoAleta, matAleta, cantidadAletas * 2);
    const matrizAleta = new THREE.Matrix4();

    // Caja luminosa del aplique.
    const geoAplique = new THREE.BoxGeometry(0.28, 1.3, 0.55);
    const matAplique = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#f5c542').multiplyScalar(2.8),
    });

    for (const lado of [-1, 1]) {
      const geoPared = new THREE.PlaneGeometry(largo, alto);
      const pared = new THREE.Mesh(geoPared, matPared);
      pared.position.set(lado * ancho, alto / 2, centro);
      pared.rotation.y = (-lado * Math.PI) / 2;
      pared.receiveShadow = true;
      scene.add(pared);

      for (let i = 0; i < cantidadAletas; i++) {
        matrizAleta.makeTranslation(lado * (ancho - 0.18), 18.5, this.frenteZ + 6 + i * 4.2);
        aletas.setMatrixAt(i * 2 + (lado > 0 ? 1 : 0), matrizAleta);
      }

      const geoCornisa = new THREE.BoxGeometry(0.12, 0.12, largo - 6);
      const cornisa = new THREE.Mesh(geoCornisa, matCornisa);
      cornisa.position.set(lado * (ancho - 0.5), 29.2, centro + 2);
      scene.add(cornisa);

      const geoCornisaBaja = new THREE.BoxGeometry(0.1, 0.1, largo - 6);
      const cornisaBaja = new THREE.Mesh(geoCornisaBaja, matCornisa);
      cornisaBaja.position.set(lado * (ancho - 0.4), 8.2, centro + 2);
      scene.add(cornisaBaja);

      for (const z of [0, 10, 20, 30, 40]) {
        const y = 11.5 + z * 0.08;

        const caja = new THREE.Mesh(geoAplique, matAplique);
        caja.position.set(lado * (ancho - 0.15), y, z);
        scene.add(caja);

        const geoLavado = new THREE.PlaneGeometry(3.6, 12);
        const lavado = new THREE.Mesh(geoLavado, matHaz);
        lavado.position.set(lado * (ancho - 0.05), y, z);
        lavado.rotation.y = (-lado * Math.PI) / 2;
        scene.add(lavado);

        const luz = new THREE.PointLight(0xf5c542, 40, 26, 2);
        luz.position.set(lado * (ancho - 1.5), y, z);
        scene.add(luz);
        this.apliques.push(luz);
      }
    }

    aletas.instanceMatrix.needsUpdate = true;
    scene.add(aletas);
    this.aletas = aletas;

    // Pared frontal, pared trasera y techo: solo se ven desde adentro.
    const geoFrente = new THREE.PlaneGeometry(ancho * 2, alto);
    const matFrente = new THREE.MeshStandardMaterial({ color: 0x14090b, roughness: 1 });
    const frente = new THREE.Mesh(geoFrente, matFrente);
    frente.position.set(0, alto / 2, this.frenteZ);
    scene.add(frente);

    const geoFondo = new THREE.PlaneGeometry(ancho * 2, alto);
    const fondo = new THREE.Mesh(geoFondo, matPared);
    fondo.position.set(0, alto / 2, this.fondoZ);
    fondo.rotation.y = Math.PI;
    scene.add(fondo);

    const geoTecho = new THREE.PlaneGeometry(ancho * 2, largo);
    const matTecho = new THREE.MeshStandardMaterial({ color: 0x0b0608, roughness: 1 });
    const techo = new THREE.Mesh(geoTecho, matTecho);
    techo.rotation.x = Math.PI / 2;
    techo.position.set(0, alto, centro);
    scene.add(techo);
  }

  // Techo de estrellas que titilan. Se apagan cuando la cámara sube por encima.
  private armarTechoEstrellado(scene: THREE.Scene): void {
    const cantidad = 1100;
    const posiciones = new Float32Array(cantidad * 3);
    const semillas = new Float32Array(cantidad);

    for (let i = 0; i < cantidad; i++) {
      const x = (Math.random() * 2 - 1) * (this.anchoX - 1);
      const y = this.alto - 0.08;
      const z = this.frenteZ + 2 + Math.random() * (this.largoSala - 3);

      posiciones.set([x, y, z], i * 3);
      semillas[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(semillas, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: this.compartidos.uTime,
        uSize: { value: 2.2 },
        uPR: { value: this.dpr },
        uColor: { value: new THREE.Color(1.6, 1.7, 2.2) },
        uOpacity: { value: 1 },
      },
      vertexShader: SHADER_PUNTOS_VS.replace('DRIFT', '0.0'),
      fragmentShader: SHADER_PUNTOS_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const estrellas = new THREE.Points(geo, mat);
    scene.add(estrellas);
    this.estrellas = estrellas;
  }

  // Tarima, pantalla curva con la película, marco, halo y reflejo sobre el piso.
  private armarEscenarioYPantalla(scene: THREE.Scene, texturas: Record<string, THREE.CanvasTexture>): void {
    const ancho = this.anchoX;
    const pantalla = this.pantalla;

    const geoTarima = new THREE.BoxGeometry(ancho * 2, 1.1, 8.2);
    const matTarima = new THREE.MeshStandardMaterial({
      color: 0x1f1013,
      roughness: 0.22,
      metalness: 0.7,
    });
    const tarima = new THREE.Mesh(geoTarima, matTarima);
    tarima.position.set(0, 0.55, this.frenteZ + 4.1);
    tarima.receiveShadow = true;
    scene.add(tarima);

    const geoLedTarima = new THREE.BoxGeometry(ancho * 2, 0.08, 0.05);
    const matLedTarima = new THREE.ShaderMaterial({
      uniforms: { ...this.compartidos },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uTint; varying vec3 vW;
        void main(){
          float k = 0.5 + 0.5*sin(vW.x*0.12 - uTime*0.8);
          vec3 c = mix(vec3(0.55,0.25,1.0), mix(uTint, vec3(0.3,0.85,1.0), 0.5), k);
          gl_FragColor = vec4(c * 3.0 * (1.0 - smoothstep(26., 31., abs(vW.x))), 1.);
        }`,
    });
    const ledTarima = new THREE.Mesh(geoLedTarima, matLedTarima);
    ledTarima.position.set(0, 1.08, this.frenteZ + 8.22);
    scene.add(ledTarima);

    const matPantalla = new THREE.ShaderMaterial({
      uniforms: {
        ...this.compartidos,
        uTitle: { value: texturas['titulo'] },
        uTitleMix: { value: 0 },
      },
      side: THREE.BackSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: SHADER_PANTALLA_FS,
    });
    this.pantallaMat = matPantalla;

    const arco = pantalla.w / pantalla.r;
    const geoPantalla = new THREE.CylinderGeometry(
      pantalla.r,
      pantalla.r,
      pantalla.h,
      120,
      1,
      true,
      Math.PI - arco / 2,
      arco,
    );
    const mallaPantalla = new THREE.Mesh(geoPantalla, matPantalla);
    mallaPantalla.position.set(0, pantalla.y, pantalla.z + pantalla.r);
    scene.add(mallaPantalla);

    const arcoMarco = (pantalla.w + 1.6) / pantalla.r;
    const geoMarco = new THREE.CylinderGeometry(
      pantalla.r + 0.15,
      pantalla.r + 0.15,
      pantalla.h + 1.6,
      120,
      1,
      true,
      Math.PI - arcoMarco / 2,
      arcoMarco,
    );
    const matMarco = new THREE.MeshStandardMaterial({
      color: 0x14090b,
      roughness: 0.9,
      side: THREE.BackSide,
    });
    const marco = new THREE.Mesh(geoMarco, matMarco);
    marco.position.copy(mallaPantalla.position);
    scene.add(marco);

    // Halo de la pantalla sobre la pared frontal.
    const matHalo = new THREE.ShaderMaterial({
      uniforms: { ...this.compartidos },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `
        uniform vec3 uTint; uniform float uPower; varying vec2 vUv;
        void main(){
          vec2 p = (vUv - 0.5) * vec2(1.25, 2.1);
          float a = exp(-length(p)*3.2) * 0.9;
          gl_FragColor = vec4(uTint * a * uPower, 1.);
        }`,
    });
    const geoHalo = new THREE.PlaneGeometry(90, 44);
    const halo = new THREE.Mesh(geoHalo, matHalo);
    halo.position.set(0, pantalla.y, this.frenteZ + 0.05);
    scene.add(halo);

    // Reflejo de la pantalla sobre la tarima.
    const matReflejo = new THREE.ShaderMaterial({
      uniforms: { ...this.compartidos },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `
        uniform vec3 uTint; uniform float uPower; varying vec2 vUv;
        void main(){
          float a = pow(clamp(vUv.y, 0., 1.), 2.5) * (1.0 - smoothstep(0.2, 0.5, abs(vUv.x - 0.5))) * 0.35;
          gl_FragColor = vec4(uTint * a * uPower, 1.);
        }`,
    });
    const geoReflejo = new THREE.PlaneGeometry(56, 12);
    const reflejo = new THREE.Mesh(geoReflejo, matReflejo);
    reflejo.rotation.x = -Math.PI / 2;
    reflejo.position.set(0, 1.12, this.frenteZ + 6);
    scene.add(reflejo);

    // Luz real que la pantalla le tira al público.
    const luz = new THREE.RectAreaLight(0xf5c542, 1.4, pantalla.w, pantalla.h);
    luz.position.set(0, pantalla.y, pantalla.z + 1.5);
    luz.lookAt(0, 4, 30);
    scene.add(luz);
    this.luzPantalla = luz;
  }

  // Cortinas de terciopelo a los lados y la de proscenio arriba.
  private armarCortinas(scene: THREE.Scene): void {
    const ancho = this.anchoX;
    const pantalla = this.pantalla;

    const terciopelo = new THREE.MeshPhysicalMaterial({
      color: 0x6e0a12,
      roughness: 0.72,
      sheen: 1,
      sheenColor: new THREE.Color(0xf0434f),
      sheenRoughness: 0.45,
      side: THREE.DoubleSide,
    });

    for (const lado of [-1, 1]) {
      const geo = geometriaDeCortina(6.4, 28, 7, 0.32);
      const cortina = new THREE.Mesh(geo, terciopelo);
      cortina.position.set(lado * (ancho - 3.2), 1.1 + 14, pantalla.z + 4.2);
      cortina.castShadow = true;
      scene.add(cortina);
      this.cortinas.push(cortina);

      const foco = new THREE.SpotLight(0xff3050, 260, 34, 0.42, 0.7, 1.4);
      foco.position.set(lado * (ancho - 3.2), 1.2, pantalla.z + 7.5);
      foco.target.position.set(lado * (ancho - 3.2), 26, pantalla.z + 4.2);
      scene.add(foco, foco.target);

      const geoLamp = new THREE.CylinderGeometry(0.25, 0.32, 0.3, 16);
      const matLamp = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#f0434f').multiplyScalar(2.4),
      });
      const lamp = new THREE.Mesh(geoLamp, matLamp);
      lamp.position.copy(foco.position);
      scene.add(lamp);
    }

    const geoProscenio = geometriaDeCortina(ancho * 2, 4.5, 34, 0.22);
    const proscenio = new THREE.Mesh(geoProscenio, terciopelo);
    proscenio.position.set(0, this.alto - 2.4, pantalla.z + 4.3);
    scene.add(proscenio);
  }

  // Haz del proyector que llega desde el fondo, con el polvo flotando adentro.
  private armarProyector(scene: THREE.Scene): void {
    const pantalla = this.pantalla;
    const origen = new THREE.Vector3(0, 21.5, this.fondoZ - 0.1);
    const destino = new THREE.Vector3(0, pantalla.y, pantalla.z);

    const grupo = new THREE.Group();
    grupo.position.copy(origen);
    grupo.lookAt(0, pantalla.y, pantalla.z);
    scene.add(grupo);

    const largoHaz = origen.distanceTo(destino);

    const geoHaz = new THREE.ConeGeometry(1, 1, 64, 1, true);
    geoHaz.translate(0, -0.5, 0);
    geoHaz.rotateX(-Math.PI / 2);

    const matHaz = new THREE.ShaderMaterial({
      uniforms: { ...this.compartidos, uOpacity: { value: 0.3 }, uRays: { value: 1 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `
        uniform float uTime, uOpacity, uRays; uniform vec3 uTint; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){
          float fres = pow(abs(dot(vN, vV)), 1.6);
          float along = vUv.y;
          float rays = mix(1.0, 0.55 + 0.45*sin(vUv.x*70. + uTime*0.5)*sin(vUv.x*23. - uTime*0.35), uRays);
          float a = fres * rays * (0.18 + 0.82*along*along) * uOpacity * (1.0 - smoothstep(0.985, 1.0, along));
          gl_FragColor = vec4(mix(vec3(1.0), uTint, 0.45) * a, 1.);
        }`,
    });
    this.hazMat = matHaz;

    const haz = new THREE.Mesh(geoHaz, matHaz);
    haz.scale.set(pantalla.w / 2, pantalla.h / 2, largoHaz);
    grupo.add(haz);

    // Ventanilla del proyector, al fondo de la sala.
    const geoVentana = new THREE.PlaneGeometry(1.6, 1);
    const matVentana = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5, 6) });
    const ventana = new THREE.Mesh(geoVentana, matVentana);
    ventana.position.set(0, origen.y, this.fondoZ - 0.03);
    ventana.rotation.y = Math.PI;
    scene.add(ventana);

    // Polvo en suspensión dentro del haz.
    const cantidad = 1600;
    const posiciones = new Float32Array(cantidad * 3);
    const semillas = new Float32Array(cantidad);

    for (let i = 0; i < cantidad; i++) {
      const avance = 0.06 + Math.random() * 0.9;
      const angulo = Math.random() * Math.PI * 2;
      const radio = Math.sqrt(Math.random()) * 0.95;
      const x = Math.cos(angulo) * radio * (pantalla.w / 2) * avance;
      const y = Math.sin(angulo) * radio * (pantalla.h / 2) * avance;
      const z = avance * largoHaz;

      posiciones.set([x, y, z], i * 3);
      semillas[i] = Math.random();
    }

    const geoPolvo = new THREE.BufferGeometry();
    geoPolvo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
    geoPolvo.setAttribute('aSeed', new THREE.BufferAttribute(semillas, 1));

    const matPolvo = new THREE.ShaderMaterial({
      uniforms: {
        uTime: this.compartidos.uTime,
        uSize: { value: 1.6 },
        uPR: { value: this.dpr },
        uColor: { value: new THREE.Color(1.2, 1.2, 1.4) },
        uOpacity: { value: 0.4 },
      },
      vertexShader: SHADER_PUNTOS_VS.replace('DRIFT', '0.35'),
      fragmentShader: SHADER_PUNTOS_FS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.polvoMat = matPolvo;

    grupo.add(new THREE.Points(geoPolvo, matPolvo));
  }

  private armarLuces(scene: THREE.Scene): void {
    const hemi = new THREE.HemisphereLight(0xc9b3a6, 0x2e1013, 0.5);
    scene.add(hemi);
    this.hemi = hemi;

    const key = new THREE.SpotLight(0xfff4e4, 2600, 0, 0.95, 0.85, 2);
    key.position.set(0, this.alto - 1, 18);
    key.target.position.set(0, 3, 20);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 5;
    key.shadow.camera.far = 50;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    scene.add(key, key.target);
    this.key = key;
  }

  // ─── Butacas ───────────────────────────────────────────────────────

  // Las butacas se arman por partes: cada modelo es un grupo de geometrías repetidas
  // con InstancedMesh. Común y VIP tienen piezas distintas.
  private armarButacas(scene: THREE.Scene): void {
    this.butacasEscena = this.armarListaButacas();
    this.porId = new Map<string, ButacaEscena>();

    for (const butaca of this.butacasEscena) {
      this.porId.set(butaca.id, butaca);
    }

    const comunes: ButacaEscena[] = [];
    const vips: ButacaEscena[] = [];

    for (const butaca of this.butacasEscena) {
      if (butaca.tipo === 'vip') {
        vips.push(butaca);
      } else {
        comunes.push(butaca);
      }
    }

    const piezas: PiezaButaca[] = [];
    this.agregarPiezas(scene, piezas, modeloComun(), comunes);
    this.agregarPiezas(scene, piezas, modeloVip(), vips);

    for (const butaca of this.butacasEscena) {
      this.pintarButaca(butaca);
    }

    for (const pieza of piezas) {
      pieza.malla.computeBoundingSphere();
    }

    this.armarSiluetas(scene);
    this.armarIconos(scene);
    this.armarAros();

    for (const butaca of this.butacasEscena) {
      this.pintarSprite(butaca);
      this.pintarAro(butaca);
    }
  }

  private armarListaButacas(): ButacaEscena[] {
    const lista: ButacaEscena[] = [];

    for (const butaca of this.butacas()) {
      const fila = this.filas3d[butaca.fila];

      if (fila !== undefined) {
        const escena: ButacaEscena = {
          ...butaca,
          x: this.columnaX(butaca.columna),
          y: fila.y,
          z: fila.z - 0.1,
          indice: lista.length,
          hover: false,
          partes: [],
          sprite: null,
        };

        lista.push(escena);
      }
    }

    return lista;
  }

  private agregarPiezas(
    scene: THREE.Scene,
    destino: PiezaButaca[],
    definiciones: DefPieza[],
    lista: ButacaEscena[],
  ): void {
    for (const def of definiciones) {
      const cantidad = lista.length * def.locales.length;
      const malla = new THREE.InstancedMesh(def.geo, def.mat, cantidad);
      malla.castShadow = def.shadow !== false;
      malla.receiveShadow = true;
      malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      if (def.glow === true) {
        def.geo.setAttribute(
          'aGlow',
          new THREE.InstancedBufferAttribute(new Float32Array(cantidad * 3), 3),
        );
      }

      const locales: THREE.Matrix4[] = [];

      for (const local of def.locales) {
        locales.push(matrizDeLocal(local));
      }

      if (def.pick === true) {
        malla.userData['seats'] = lista;
        this.seleccionables.push(malla);
      }

      scene.add(malla);

      const pieza: PiezaButaca = { malla: malla, locales: locales, def: def };
      destino.push(pieza);

      for (const butaca of lista) {
        butaca.partes.push(pieza);
      }
    }
  }

  // El componente reemplaza el array de butacas en cada cambio, así que el estado
  // nuevo se copia por id sobre la butaca que ya está en la escena.
  private pintarTodas(): void {
    if (this.butacasEscena.length === 0) {
      return;
    }

    for (const butaca of this.butacas()) {
      const escena = this.porId.get(butaca.id);

      if (escena === undefined) {
        continue;
      }

      escena.estado = butaca.estado;
      escena.seleccionada = butaca.seleccionada;
      this.pintarButaca(escena);
      this.pintarSprite(escena);
      this.pintarAro(escena);
    }

    this.pintarSiluetas();
  }

  // Escribe la posición y los colores de una butaca en todas sus piezas.
  private pintarButaca(butaca: ButacaEscena): void {
    let levantada = false;

    if (butaca.hover === true && butaca.estado === 'disponible') {
      levantada = true;
    }

    const altura = levantada ? 0.14 : 0;
    const base = MATRIZ_BASE.makeTranslation(butaca.x, butaca.y + altura, butaca.z);
    const clave = claveDeColor(butaca);
    const paleta = PALETAS[clave];

    // Se reusan colores temporales: pintar una butaca no puede crear objetos.
    const cuerpo = COLOR_CUERPO.copy(paleta.cuerpo);
    const brillo = COLOR_BRILLO.setRGB(0, 0, 0);

    if (butaca.seleccionada === true) {
      brillo.setRGB(0.34, 0.26, 0.04);
    }

    if (butaca.hover === true) {
      cuerpo.multiplyScalar(1.5);
      brillo.r += 0.14;
      brillo.g += 0.11;
      brillo.b += 0.02;
    }

    const brazos = COLOR_BRAZOS.copy(paleta.brazos);
    const matrizPieza = MATRIZ_PIEZA;

    for (const pieza of butaca.partes) {
      const porPieza = pieza.locales.length;
      const atributo = atributoDeBrillo(pieza);

      for (let k = 0; k < porPieza; k++) {
        const indice = butaca.indice * porPieza + k;
        matrizPieza.multiplyMatrices(base, pieza.locales[k]);
        pieza.malla.setMatrixAt(indice, matrizPieza);

        if (pieza.def.color === 'cuerpo') {
          pieza.malla.setColorAt(indice, cuerpo);
        } else {
          pieza.malla.setColorAt(indice, brazos);
        }

        if (atributo !== null) {
          atributo.setXYZ(indice, brillo.r, brillo.g, brillo.b);
        }
      }

      pieza.malla.instanceMatrix.needsUpdate = true;

      if (pieza.malla.instanceColor !== null) {
        pieza.malla.instanceColor.needsUpdate = true;
      }

      if (atributo !== null) {
        atributo.needsUpdate = true;
      }
    }
  }

  // Siluetas del público en las butacas ocupadas.
  private armarSiluetas(scene: THREE.Scene): void {
    const cantidad = this.butacasEscena.length;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x14090b,
      roughness: 1,
    });

    const cuerpos = new THREE.InstancedMesh(
      new THREE.CapsuleGeometry(0.3, 0.55, 4, 12),
      mat,
      cantidad,
    );
    const cabezas = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.21, 16, 12),
      mat,
      cantidad,
    );
    cuerpos.castShadow = true;
    cabezas.castShadow = true;
    scene.add(cuerpos, cabezas);

    this.silCuerpo = cuerpos;
    this.silCabeza = cabezas;
    this.pintarSiluetas();
  }

  private pintarSiluetas(): void {
    if (this.silCuerpo === null || this.silCabeza === null) {
      return;
    }

    const matriz = new THREE.Matrix4();
    let cantidad = 0;

    for (const butaca of this.butacasEscena) {
      if (butaca.estado !== 'ocupada') {
        continue;
      }

      let inclinacion = 0;

      if (butaca.tipo === 'vip') {
        inclinacion = 0.12;
      }

      const cuerpo = matriz.makeTranslation(
        butaca.x,
        butaca.y + 1.18,
        butaca.z + 0.12 + inclinacion,
      );
      this.silCuerpo.setMatrixAt(cantidad, cuerpo);

      const cabeza = matriz.makeTranslation(
        butaca.x,
        butaca.y + 1.86,
        butaca.z + 0.08 + inclinacion,
      );
      this.silCabeza.setMatrixAt(cantidad, cabeza);

      cantidad += 1;
    }

    this.silCuerpo.count = cantidad;
    this.silCabeza.count = cantidad;
    this.silCuerpo.instanceMatrix.needsUpdate = true;
    this.silCabeza.instanceMatrix.needsUpdate = true;
    this.silCuerpo.computeBoundingSphere();
    this.silCabeza.computeBoundingSphere();
  }

  // Ícono flotante sobre la butaca: check si está elegida, cruz si está ocupada,
  // candado si está bloqueada, estrella si es VIP y accesibilidad si es accesible.
  private armarIconos(scene: THREE.Scene): void {
    const grupo = new THREE.Group();
    scene.add(grupo);
    this.grupoSprites = grupo;
    this.iconosMat = {};

    for (const nombre of NOMBRES_ICONOS) {
      const estilo = estiloDeIcono(nombre);
      const textura = texturaDeIcono(nombre, estilo);
      const material = new THREE.SpriteMaterial({
        map: textura,
        depthWrite: false,
        transparent: true,
        color: nombre === 'check' ? new THREE.Color(1.6, 1.6, 1.6) : 0xffffff,
      });

      this.iconosMat[nombre] = material;
    }
  }

  private pintarSprite(butaca: ButacaEscena): void {
    const grupo = this.grupoSprites;

    if (grupo === null) {
      return;
    }

    const nombre = iconoDe(butaca);
    let sprite = butaca.sprite;

    if (nombre === '') {
      if (sprite !== null) {
        grupo.remove(sprite);
        butaca.sprite = null;
      }

      return;
    }

    if (sprite === null) {
      sprite = new THREE.Sprite(this.iconosMat[nombre]);
      grupo.add(sprite);
      butaca.sprite = sprite;
    }

    sprite.material = this.iconosMat[nombre];

    let escala = 0.72;

    if (nombre === 'star') {
      escala = 0.5;
    } else if (nombre === 'wc') {
      escala = 0.62;
    }

    let altura = 2.2;

    if (butaca.tipo === 'vip') {
      altura = 2.35;
    }

    let desplazamiento = 0;

    if (butaca.hover === true) {
      desplazamiento = 0.14;
    }

    sprite.scale.set(escala, escala, 1);
    sprite.position.set(butaca.x, butaca.y + altura + desplazamiento, butaca.z + 0.2);
  }

  // Aro que late bajo la butaca mientras está elegida.
  private armarAros(): void {
    const geo = new THREE.RingGeometry(0.82, 0.98, 48);
    geo.rotateX(-Math.PI / 2);
    this.geoAro = geo;

    this.aroMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#f5c542').multiplyScalar(2.4),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private pintarAro(butaca: ButacaEscena): void {
    if (this.geoAro === null || this.aroMat === null || this.scene === null) {
      return;
    }

    const existe = this.aros.has(butaca.id);

    if (butaca.seleccionada === true && existe === false) {
      const malla = new THREE.Mesh(this.geoAro, this.aroMat);
      malla.position.set(butaca.x, butaca.y + 0.03, butaca.z - 0.05);
      this.scene.add(malla);

      const aro: AroSeleccion = { malla: malla, nacimiento: this.compartidos.uTime.value };
      this.aros.set(butaca.id, aro);
    } else if (butaca.seleccionada !== true && existe === true) {
      const aro = this.aros.get(butaca.id);

      if (aro !== undefined) {
        this.scene.remove(aro.malla);
        this.aros.delete(butaca.id);
      }
    }
  }

  // Letra de fila a los dos lados, número de columna arriba de la fila A y la
  // etiqueta VIP en las filas correspondientes.
  private armarEtiquetas(scene: THREE.Scene): void {
    this.etiquetasFila = [];

    for (const letra of FILAS) {
      const fila = this.filas3d[letra];
      const esVip = FILAS_VIP.includes(letra);

      let color = '#c9b3a6';

      if (esVip) {
        color = '#f5c542';
      } else if (letra === 'J') {
        color = '#4fa3e0';
      }

      for (const lado of [-1, 1]) {
        const sprite = this.spriteDeTexto(letra, color, { tamano: 1.25 });
        sprite.position.set(lado * (this.columnaX(TOTAL_COLUMNAS) + 2.3), fila.y + 1.1, fila.z);
        scene.add(sprite);
      }

      if (esVip) {
        const opciones: OpcionesSprite = {
          tamano: 0.8,
          fuente: FUENTE_CUERPO,
          peso: '700',
          ancho: 256,
          halo: 'rgba(245,197,66,.9)',
        };
        const sprite = this.spriteDeTexto('VIP', '#f5c542', opciones);
        sprite.position.set(this.columnaX(TOTAL_COLUMNAS) + 4.3, fila.y + 1.1, fila.z);
        scene.add(sprite);
      }
    }

    const filaA = this.filas3d['A'];

    for (let columna = 1; columna <= TOTAL_COLUMNAS; columna++) {
      if (PASILLOS.includes(columna)) {
        continue;
      }

      const opciones: OpcionesSprite = {
        tamano: 0.75,
        fuente: FUENTE_CUERPO,
        peso: '500',
      };
      const sprite = this.spriteDeTexto(String(columna), '#9a8478', opciones);
      sprite.position.set(this.columnaX(columna), filaA.y + 3.0, filaA.z + 0.6);
      scene.add(sprite);
    }
  }

  private spriteDeTexto(texto: string, color: string, opciones: OpcionesSprite): THREE.Sprite {
    let tamano = 1.2;
    let fuente = FUENTE_TITULO;
    let peso = '';
    let halo = 'rgba(0,0,0,.8)';
    let ancho = 128;

    if (opciones.tamano !== undefined) {
      tamano = opciones.tamano;
    }

    if (opciones.fuente !== undefined) {
      fuente = opciones.fuente;
    }

    if (opciones.peso !== undefined) {
      peso = opciones.peso;
    }

    if (opciones.halo !== undefined) {
      halo = opciones.halo;
    }

    if (opciones.ancho !== undefined) {
      ancho = opciones.ancho;
    }

    const textura = texturaDeTexto(texto, color, fuente, peso, halo, ancho);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textura,
        depthWrite: false,
        transparent: true,
      }),
    );
    sprite.scale.set(tamano * (ancho / 128), tamano, 1);
    this.etiquetasFila.push(sprite);

    return sprite;
  }

  // ─── Cámara ────────────────────────────────────────────────────────

  // Doble clic sobre una butaca: la cámara va a los ojos de quien se sienta ahí.
  private entrarPOV(butaca: ButacaEscena): void {
    let alturaOjos = 1.9;

    if (butaca.tipo === 'vip') {
      alturaOjos = 1.75;
    }

    const ojo = new THREE.Vector3(butaca.x, butaca.y + alturaOjos, butaca.z + 0.15);
    this.povBase.copy(this.screenCenter);
    this.povOffset.set(0, 0);
    this.volarA(ojo, this.screenCenter, { dur: 2.2, arc: 5, pov: true });
    this.resaltar(null);
    this.cambioCamara.emit('pov');
  }

  private ajustarAAncho(posicion: THREE.Vector3, objetivo: THREE.Vector3): THREE.Vector3 {
    let factor = 1;
    const aspect = this.camera !== null ? this.camera.aspect : 1;

    if (aspect < 1.2) {
      factor = Math.min(1.6, 0.9 / aspect);
    }

    const desplazamiento = posicion.clone().sub(objetivo).multiplyScalar(factor);
    const lejos = objetivo.clone().add(desplazamiento);

    return lejos;
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

    if (this.controls === null || this.camera === null) {
      return;
    }

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

  // ─── Interacción ───────────────────────────────────────────────────

  private escucharEventos(canvas: HTMLCanvasElement): void {
    const alMover = (evento: PointerEvent) => this.alMover(evento, canvas);
    const alPresionar = (evento: PointerEvent) => this.alPresionar(evento);
    const alSoltar = (evento: PointerEvent) => this.alSoltar(evento);
    const alDobleClic = () => this.alDobleClic();
    const alSalir = () => this.alSalir();
    const alTeclear = (evento: KeyboardEvent) => this.alTeclear(evento);

    canvas.addEventListener('pointermove', alMover);
    canvas.addEventListener('pointerdown', alPresionar);
    canvas.addEventListener('pointerup', alSoltar);
    canvas.addEventListener('dblclick', alDobleClic);
    canvas.addEventListener('pointerleave', alSalir);
    document.addEventListener('keydown', alTeclear);

    const quitarMover = () => canvas.removeEventListener('pointermove', alMover);
    const quitarPresionar = () => canvas.removeEventListener('pointerdown', alPresionar);
    const quitarSoltar = () => canvas.removeEventListener('pointerup', alSoltar);
    const quitarDobleClic = () => canvas.removeEventListener('dblclick', alDobleClic);
    const quitarSalir = () => canvas.removeEventListener('pointerleave', alSalir);
    const quitarTeclear = () => document.removeEventListener('keydown', alTeclear);

    this.quitarEventos.push(
      quitarMover,
      quitarPresionar,
      quitarSoltar,
      quitarDobleClic,
      quitarSalir,
      quitarTeclear,
    );
  }

  // Escape desde la vista de la butaca vuelve a la panorámica.
  private alTeclear(evento: KeyboardEvent): void {
    const salirDeButaca = evento.key === 'Escape' && this.modoCamara === 'pov';

    if (salirDeButaca === true) {
      this.preset('overview');
    }
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
    if (this.inicioToque === null) {
      return;
    }

    const distancia = Math.hypot(
      evento.clientX - this.inicioToque.x,
      evento.clientY - this.inicioToque.y,
    );

    if (distancia > 6) {
      return;
    }

    const butaca = this.butacaBajoPuntero();

    if (butaca !== null && this.modo() === 'elegir') {
      this.ngZone.run(() => this.butacaClick.emit(butaca));
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

    if (this.camera === null || this.seleccionables.length === 0) {
      return bandera;
    }

    const coordenadas = this.ndc.set(this.puntero.x, this.puntero.y);
    this.raycaster.setFromCamera(coordenadas, this.camera);
    const impactos = this.raycaster.intersectObjects(this.seleccionables, false);
    const impacto = impactos[0];

    if (impacto !== undefined && impacto.instanceId !== undefined) {
      const butacas = impacto.object.userData['seats'];

      if (Array.isArray(butacas)) {
        const butaca = butacas[impacto.instanceId];

        if (butaca !== undefined && butaca !== null) {
          bandera = butaca;
        }
      }
    }

    return bandera;
  }

  private resaltar(butaca: ButacaEscena | null): void {
    if (this.resaltada === butaca) {
      return;
    }

    const anterior = this.resaltada;
    this.resaltada = butaca;

    if (anterior !== null) {
      anterior.hover = false;
      this.pintarButaca(anterior);
      this.pintarSprite(anterior);
    }

    let cursor = '';

    if (butaca !== null) {
      butaca.hover = true;
      this.pintarButaca(butaca);
      this.pintarSprite(butaca);

      if (butaca.estado === 'disponible') {
        cursor = 'pointer';
      } else {
        cursor = 'not-allowed';
      }
    }

    this.elemento.nativeElement.style.cursor = cursor;
  }

  // ─── Bucle de render ───────────────────────────────────────────────

  private cuadro(): void {
    this.idAnimacion = requestAnimationFrame(() => this.cuadro());

    if (this.activo() === false) {
      this.reloj.getDelta();
      return;
    }

    this.dibujarCuadro();
  }

  private dibujarCuadro(): void {
    if (this.renderer === null || this.scene === null || this.camera === null) {
      return;
    }

    const dt = Math.min(this.reloj.getDelta(), 0.05);
    const tiempo = (this.compartidos.uTime.value += dt);

    this.actualizarTinte(tiempo);
    this.actualizarLuces(dt, tiempo);
    this.actualizarEtiquetas();
    this.moverCortinas(tiempo);
    this.moverCamara(dt);
    this.revisarHover();
    this.moverAros(tiempo);

    if (this.composer !== null) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.introducirCamara();
  }

  // El mismo tinte viaja a la pantalla, al halo, a la luz real y a la cornisa.
  private actualizarTinte(tiempo: number): void {
    const cantidad = this.tintes.length;
    const avance = (tiempo / 14) % cantidad;
    const i0 = Math.floor(avance);
    const f = avance - i0;
    const siguiente = (i0 + 1) % cantidad;
    const tinte = this.compartidos.uTint.value;

    tinte.copy(this.tintes[i0]);
    tinte.lerp(this.tintes[siguiente], f * f * (3 - 2 * f));
  }

  private actualizarLuces(dt: number, tiempo: number): void {
    this.luzSala += (this.luzSalaObjetivo - this.luzSala) * (1 - Math.exp(-dt * 1.8));
    this.compartidos.uHouse.value = this.luzSala;

    const modoFuncion = 1 - this.luzSala;
    this.compartidos.uPower.value = 0.85 + modoFuncion * 0.2;

    // El cartel de la pantalla aparece y desaparece cada 26 segundos, y solo con
    // las luces de sala prendidas.
    if (this.pantallaMat !== null) {
      const ciclo = (tiempo % 26) / 26;
      const entra = THREE.MathUtils.smoothstep(ciclo, 0.1, 0.25);
      const sale = THREE.MathUtils.smoothstep(ciclo, 0.7, 0.85);

      this.pantallaMat.uniforms['uTitleMix'].value = this.luzSala * entra * (1 - sale);
    }

    if (this.luzPantalla !== null) {
      this.luzPantalla.color.copy(this.compartidos.uTint.value);
      this.luzPantalla.intensity = 1.3 + modoFuncion * 1.6 + Math.sin(tiempo * 7) * 0.05;
    }

    if (this.hazMat !== null) {
      this.hazMat.uniforms['uOpacity'].value = 0.14 + modoFuncion * 0.4;
    }

    if (this.polvoMat !== null) {
      this.polvoMat.uniforms['uOpacity'].value = 0.25 + modoFuncion * 0.9;
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

    if (this.bloom !== null) {
      this.bloom.strength = 0.75 + modoFuncion * 0.15;
    }

    if (this.estrellas !== null && this.camera !== null) {
      this.estrellas.visible = this.camera.position.y < this.alto - 0.5;
    }

    if (this.aletas !== null && this.camera !== null) {
      this.aletas.visible = Math.abs(this.camera.position.x) < this.anchoX;
    }

    if (this.grupoSprites !== null) {
      this.grupoSprites.visible = this.modoCamara !== 'pov' || this.vuelo !== null;
    }
  }

  // Las etiquetas se van desvaneciendo cuando la cámara se acerca.
  private actualizarEtiquetas(): void {
    if (this.camera === null) {
      return;
    }

    for (const etiqueta of this.etiquetasFila) {
      const distancia = this.camera.position.distanceTo(etiqueta.position);
      etiqueta.material.opacity = THREE.MathUtils.smoothstep(distancia, 7, 18);
    }
  }

  private moverCortinas(tiempo: number): void {
    for (const cortina of this.cortinas) {
      cortina.rotation.y = Math.sin(tiempo * 0.6 + cortina.position.x) * 0.01;
    }
  }

  private moverCamara(dt: number): void {
    if (this.camera === null) {
      return;
    }

    if (this.vuelo !== null) {
      this.avanzarVuelo();

      return;
    }

    if (this.modoCamara === 'pov') {
      // Desde la butaca, la mirada sigue un poco al puntero.
      this.povOffset.x += (this.puntero.x * 16 - this.povOffset.x) * (1 - Math.exp(-dt * 3));
      this.povOffset.y += (this.puntero.y * 7 - this.povOffset.y) * (1 - Math.exp(-dt * 3));
      this.lookTarget.set(
        this.povBase.x + this.povOffset.x,
        this.povBase.y + this.povOffset.y,
        this.povBase.z,
      );
      this.camera.lookAt(this.lookTarget);

      return;
    }

    if (this.controls !== null) {
      this.controls.update();
    }
  }

  private avanzarVuelo(): void {
    if (this.camera === null || this.vuelo === null) {
      return;
    }

    const avance = Math.min((performance.now() - this.vuelo.start) / this.vuelo.dur, 1);
    const suave = suavizar(avance);

    this.camera.position.lerpVectors(this.vuelo.p0, this.vuelo.p1, suave);
    this.camera.position.y += Math.sin(Math.PI * suave) * this.vuelo.arc;
    this.lookTarget.lerpVectors(this.vuelo.t0, this.vuelo.t1, suave);
    this.camera.lookAt(this.lookTarget);

    if (avance < 1) {
      return;
    }

    this.vuelo = null;

    if (this.modoCamara === 'orbit' && this.controls !== null) {
      this.controls.target.copy(this.lookTarget);
      this.controls.enabled = true;
      this.controls.update();
    }
  }

  private revisarHover(): void {
    const corresponde = this.puntero.movido === true && this.vuelo === null;

    if (corresponde !== true || this.modoCamara !== 'orbit') {
      return;
    }

    this.puntero.movido = false;
    const butaca = this.butacaBajoPuntero();
    this.resaltar(butaca);
    this.ngZone.run(() => this.butacaHover.emit({ butaca: butaca, x: this.puntero.cx, y: this.puntero.cy }));
  }

  private moverAros(tiempo: number): void {
    for (const aro of this.aros.values()) {
      const a = ((tiempo - aro.nacimiento) % 1.6) / 1.6;
      aro.malla.scale.setScalar(1 + a * 0.5);
    }

    if (this.aroMat !== null) {
      this.aroMat.opacity = 0.55 + 0.45 * Math.sin(tiempo * 3);
    }
  }

  // La primera vez que se ve la sala, la cámara baja desde el fondo hasta la
  // panorámica. Si el sistema pide menos movimiento, aparece ya en su lugar.
  private introducirCamara(): void {
    if (this.introHecha === true || this.camera === null || this.controls === null) {
      return;
    }

    this.introHecha = true;

    const objetivo = new THREE.Vector3(0, 5, 12);
    const posicion = this.ajustarAAncho(new THREE.Vector3(0, 33, 76), objetivo);
    const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (menosMovimiento === true) {
      this.camera.position.copy(posicion);
      this.controls.target.copy(objetivo);
      this.lookTarget.copy(objetivo);
      this.controls.enabled = true;
      this.controls.update();

      return;
    }

    this.volarA(posicion, objetivo, { dur: 4.2, arc: 0 });
  }

  // ─── Liberación ────────────────────────────────────────────────────

  private liberarRecursos(): void {
    if (this.idAnimacion !== null) {
      cancelAnimationFrame(this.idAnimacion);
      this.idAnimacion = null;
    }

    if (this.observadorTamanio !== null) {
      this.observadorTamanio.disconnect();
      this.observadorTamanio = null;
    }

    for (const quitar of this.quitarEventos) {
      quitar();
    }

    this.quitarEventos = [];

    if (this.scene !== null) {
      for (const aro of this.aros.values()) {
        this.scene.remove(aro.malla);
      }

      liberarEscena(this.scene);
    }

    this.aros.clear();

    if (this.controls !== null) {
      this.controls.dispose();
      this.controls = null;
    }

    if (this.composer !== null) {
      this.composer.dispose();
      this.composer = null;
    }

    if (this.renderer !== null) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
  }
}

// ─── Auxiliares ─────────────────────────────────────────────────────

// Las texturas del canvas usan las tipografías del design system: Anton para los
// títulos y Figtree para el texto courant.
const FUENTE_TITULO = "'Anton'";
const FUENTE_CUERPO = "'Figtree'";

const SHADER_PUNTOS_VS = `
  uniform float uTime, uSize, uPR; attribute float aSeed; varying float vA;
  void main(){
    vec3 p = position;
    p += vec3(sin(uTime*0.2 + aSeed*40.), cos(uTime*0.17 + aSeed*30.), sin(uTime*0.13 + aSeed*20.)) * DRIFT;
    vec4 mv = modelViewMatrix*vec4(p,1.);
    vA = 0.35 + 0.65*abs(sin(uTime*(0.6 + aSeed*1.8) + aSeed*60.));
    gl_PointSize = min(uSize * (0.4 + aSeed) * uPR * (60. / -mv.z), 7.0 * uPR);
    gl_Position = projectionMatrix*mv;
  }`;

const SHADER_PUNTOS_FS = `
  uniform vec3 uColor; uniform float uOpacity; varying float vA;
  void main(){
    float d = length(gl_PointCoord - 0.5);
    float a = 1.0 - smoothstep(0.0, 0.5, d);
    gl_FragColor = vec4(uColor * a * a * vA * uOpacity, 1.);
  }`;

// La pantalla mezcla nubes de ruido, dos capas de estrellas fijas, un planeta en el
// horizonte con su amanecer, y el cartel del título de la película.
const SHADER_PANTALLA_FS = `
  uniform float uTime, uPower, uTitleMix; uniform vec3 uTint; uniform sampler2D uTitle; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
  float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ v+=a*noise(p); p=m*p; a*=.5; } return v; }
  void main(){
    vec2 uv = vec2(1.0 - vUv.x, vUv.y);
    vec2 a = (uv - 0.5) * vec2(2.5, 1.0);
    float t = uTime * 0.04;
    vec2 q = vec2(fbm(a*1.4 + vec2(t, 0.)), fbm(a*1.4 + vec2(5.2, 1.3 - t)));
    vec2 r = vec2(fbm(a*1.4 + 3.5*q + vec2(1.7 - t*1.3, 9.2)), fbm(a*1.4 + 3.5*q + vec2(8.3, 2.8 + t)));
    float f = fbm(a*1.4 + 3.0*r);
    vec3 col = vec3(0.01, 0.01, 0.035);
    col = mix(col, uTint * 0.9, smoothstep(0.35, 0.95, f));
    col = mix(col, vec3(0.95, 0.35, 0.55) * 0.8, smoothstep(0.55, 1.1, r.x) * 0.55);
    col += vec3(0.6, 0.8, 1.0) * pow(f, 6.0) * 1.1;
    col *= 0.85 + 0.45*q.y;
    for (int L = 0; L < 2; L++) {
      float sc = L == 0 ? 90.0 : 170.0;
      vec2 g = a*sc + vec2(uTime*0.25*(float(L)+1.), 0.);
      vec2 id = floor(g); vec2 fr = fract(g) - 0.5;
      float h = hash(id + float(L)*13.1);
      float st = step(0.975, h) * (1.0 - smoothstep(0.0, 0.22, length(fr - (vec2(hash(id+3.1), hash(id+7.7)) - 0.5)*0.5)));
      col += st * (0.6 + 0.6*sin(uTime*3.0 + h*80.0));
    }
    vec2 pc = vec2(0.0, -2.05); float pr = 1.75;
    float d = length(a - pc) - pr;
    if (d < 0.0) {
      float ang = atan(a.x - pc.x, a.y - pc.y);
      float surf = fbm(vec2(ang*9.0 + uTime*0.015, d*24.0));
      vec3 pcol = mix(vec3(0.01,0.012,0.03), uTint*0.22, surf);
      col = pcol * (smoothstep(-0.45, 0.0, d)*1.4 + 0.15);
    }
    vec3 rimCol = mix(uTint, vec3(0.8, 0.95, 1.0), 0.5);
    col += rimCol * (exp(-abs(d)*45.0)*1.7 + exp(-max(d,0.)*6.0)*0.28);
    float sa = sin(uTime*0.05) * 0.5;
    vec2 dv = a - (pc + vec2(sin(sa), cos(sa)) * (pr + 0.01));
    col += vec3(1.0, 0.9, 0.8) * (0.012 / (length(dv) + 0.004));
    col += mix(uTint, vec3(0.6,0.8,1.0), 0.5) * exp(-abs(dv.y)*90.0) * exp(-abs(dv.x)*1.2) * 0.9;
    vec4 tt = texture2D(uTitle, uv);
    col = mix(col, col*0.35 + vec3(1.0, 0.97, 0.92)*0.95, tt.a * uTitleMix);
    col *= 1.0 - smoothstep(0.35, 1.45, length((uv - 0.5) * vec2(1.9, 1.5)));
    col *= 0.97 + 0.03*sin(uTime*47.0);
    col *= smoothstep(0.0, 0.008, uv.x) * (1.0 - smoothstep(0.992, 1.0, uv.x)) * smoothstep(0.0, 0.015, uv.y) * (1.0 - smoothstep(0.985, 1.0, uv.y));
    gl_FragColor = vec4(col * uPower, 1.0);
  }`;

const NOMBRES_ICONOS = ['check', 'x', 'lock', 'star', 'wc'];

// Trazos de los íconos, en una grilla de 24x24 como los del mapa 2D.
const TRAZOS_ICONOS: Record<string, { d: string; fill?: boolean }[]> = {
  x: [{ d: 'M7 7l10 10M17 7L7 17' }],
  check: [{ d: 'M5.5 12.5l4 4L18.5 7.5' }],
  lock: [
    { d: 'M8.5 11V8.3a3.5 3.5 0 0 1 7 0V11' },
    { d: 'M6.5 11h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z', fill: true },
  ],
  star: [{ d: 'M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6l-5.2 2.8 1-5.9L3.5 9.4l5.9-.8z', fill: true }],
  wc: [
    { d: 'M12.2 2.8a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z', fill: true },
    { d: 'M12 8.5v5h4.2l2 4.8' },
    { d: 'M12 11h3.6' },
    { d: 'M9.2 11.2a4.8 4.8 0 1 0 6.3 6.2' },
  ],
};

// Los mismos colores de seatmap.html, con los nombres del dominio.
const PALETAS: Record<string, Paleta> = {
  comun: { cuerpo: new THREE.Color('#4a3038'), brazos: new THREE.Color('#2b1c22') },
  vip: { cuerpo: new THREE.Color('#d81e2c'), brazos: new THREE.Color('#6e0a12') },
  accesible: { cuerpo: new THREE.Color('#4fa3e0'), brazos: new THREE.Color('#1f3a52') },
  ocupada: { cuerpo: new THREE.Color('#7a5a52'), brazos: new THREE.Color('#4a3a34') },
  bloqueada: { cuerpo: new THREE.Color('#2b181c'), brazos: new THREE.Color('#1f1013') },
  seleccionada: { cuerpo: new THREE.Color('#f5c542'), brazos: new THREE.Color('#7a5a12') },
};

// Objetos reutilizables: pintar una butaca no puede crear nada nuevo.
const COLOR_CUERPO = new THREE.Color();
const COLOR_BRAZOS = new THREE.Color();
const COLOR_BRILLO = new THREE.Color();
const MATRIZ_BASE = new THREE.Matrix4();
const MATRIZ_PIEZA = new THREE.Matrix4();

function estiloDeIcono(nombre: string): EstiloIcono {
  const estilos: Record<string, EstiloIcono> = {
    check: { fondo: '#d81e2c', trazo: '#fff4e4', halo: 'rgba(216,30,44,.9)' },
    x: { fondo: '#1f1013', trazo: '#c9b3a6', borde: '#3a2328' },
    lock: { fondo: '#1f1013', trazo: '#c9b3a6', borde: '#3a2328' },
    star: { trazo: '#f5c542', halo: 'rgba(245,197,66,.9)' },
    wc: { fondo: '#4fa3e0', trazo: '#fff4e4', borde: '#1f3a52' },
  };
  const estilo = estilos[nombre];
  let elegido: EstiloIcono = { trazo: '#fff4e4' };

  if (estilo !== undefined) {
    elegido = estilo;
  }

  return elegido;
}

// El dorado del design system, atenuado para que la tira de LED no queme la
// exposición de la escena.
function colorDePantalla(): THREE.Color {
  const color = new THREE.Color('#f5c542');
  color.multiplyScalar(0.62);

  return color;
}

function claveDeColor(butaca: ButacaEscena): string {  let clave: string = butaca.tipo;

  if (butaca.seleccionada === true) {
    clave = 'seleccionada';
  } else if (butaca.estado !== 'disponible') {
    clave = butaca.estado;
  }

  return clave;
}

function iconoDe(butaca: ButacaEscena): string {
  let nombre = '';

  if (butaca.seleccionada === true) {
    nombre = 'check';
  } else if (butaca.estado === 'ocupada') {
    nombre = 'x';
  } else if (butaca.estado === 'bloqueada') {
    nombre = 'lock';
  } else if (butaca.tipo === 'vip') {
    nombre = 'star';
  } else if (butaca.tipo === 'accesible') {
    nombre = 'wc';
  }

  return nombre;
}

function texturaDeIcono(nombre: string, estilo: EstiloIcono): THREE.CanvasTexture {
  const textura = texturaDeLienzo(128, 128, (g) => {
    if (estilo.fondo !== undefined) {
      g.shadowColor = estilo.halo !== undefined ? estilo.halo : 'rgba(0,0,0,.6)';
      g.shadowBlur = 18;
      g.fillStyle = estilo.fondo;
      g.beginPath();
      g.roundRect(18, 18, 92, 92, 24);
      g.fill();
      g.shadowBlur = 0;

      if (estilo.borde !== undefined) {
        g.strokeStyle = estilo.borde;
        g.lineWidth = 3;
        g.stroke();
      }
    } else {
      g.shadowColor = estilo.halo !== undefined ? estilo.halo : 'rgba(0,0,0,.6)';
      g.shadowBlur = 20;
    }

    dibujarIcono(g, nombre, 34, 34, 60, estilo.trazo, 2.6);
  });

  return textura;
}

function dibujarIcono(
  g: Contexto2d,
  nombre: string,
  x: number,
  y: number,
  tamano: number,
  color: string,
  grosor: number,
): void {
  const trazos = TRAZOS_ICONOS[nombre];

  if (trazos === undefined) {
    return;
  }

  g.save();
  g.translate(x, y);
  g.scale(tamano / 24, tamano / 24);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = grosor;
  g.lineCap = 'round';
  g.lineJoin = 'round';

  for (const trazo of trazos) {
    const camino = new Path2D(trazo.d);

    if (trazo.fill === true) {
      g.fill(camino);
    } else {
      g.stroke(camino);
    }
  }

  g.restore();
}

// El cartel que se dibuja en la pantalla entre medio de la película.
function texturaDeTitulo(): THREE.CanvasTexture {
  const textura = texturaDeLienzo(2048, 820, (g) => {
    g.textAlign = 'center';
    g.fillStyle = '#fff4e4';
    g.font = `500 40px ${FUENTE_CUERPO}`;
    g.letterSpacing = '16px';
    g.globalAlpha = 0.75;
    g.fillText('NOVA CINE PRESENTA', 1024, 250);
    g.globalAlpha = 1;
    g.font = `220px ${FUENTE_TITULO}`;
    g.letterSpacing = '26px';
    g.shadowColor = 'rgba(245,197,66,1)';
    g.shadowBlur = 50;
    g.fillText('HORIZONTE ESTELAR', 1024, 460);
    g.shadowBlur = 0;
    g.font = `300 36px ${FUENTE_CUERPO}`;
    g.letterSpacing = '10px';
    g.globalAlpha = 0.7;
    g.fillText('LA FUNCIÓN COMIENZA EN BREVE', 1024, 540);
  });

  return textura;
}

function texturaDeTexto(
  texto: string,
  color: string,
  fuente: string,
  peso: string,
  halo: string,
  ancho: number,
): THREE.CanvasTexture {
  const textura = texturaDeLienzo(ancho, 128, (g) => {
    g.font = `${peso} 96px ${fuente}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = halo;
    g.shadowBlur = 16;
    g.fillStyle = color;
    g.fillText(texto, ancho / 2, 70);
  });

  return textura;
}

function texturaDeLienzo(
  ancho: number,
  alto: number,
  dibujar: (g: Contexto2d) => void,
  repeticion?: [number, number],
): THREE.CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;

  const contexto = lienzo.getContext('2d');

  if (contexto === null) {
    return new THREE.CanvasTexture(lienzo);
  }

  const g = contexto as Contexto2d;
  dibujar(g);

  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;

  if (repeticion !== undefined) {
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    textura.repeat.set(repeticion[0], repeticion[1]);
  }

  return textura;
}

// Tela con pliegues: un plano al que se le mueven los puntos en Z.
function geometriaDeCortina(
  ancho: number,
  alto: number,
  pliegues: number,
  amplitud: number,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(ancho, alto, pliegues * 8, 12);
  const posiciones = geo.attributes['position'];

  for (let i = 0; i < posiciones.count; i++) {
    const x = posiciones.getX(i);
    const y = posiciones.getY(i);
    const k = (x / ancho + 0.5) * pliegues * Math.PI * 2;
    const z = Math.sin(k) * amplitud * (1 + 0.15 * Math.sin(y * 0.4 + k * 0.3));
    posiciones.setZ(i, z);
  }

  geo.computeVertexNormals();

  return geo;
}

// Butaca común: asiento, respaldo, dos brazos y un posavasos.
function modeloComun(): DefPieza[] {
  const piezas: DefPieza[] = [];

  piezas.push({
    geo: redondeada(1.12, 0.26, 0.95, 0.09),
    mat: materialCuerpo(),
    color: 'cuerpo',
    glow: true,
    pick: true,
    locales: [{ p: [0, 0.52, -0.05], r: 0 }],
  });

  piezas.push({
    geo: redondeada(1.14, 1.25, 0.24, 0.1),
    mat: materialCuerpo(),
    color: 'cuerpo',
    glow: true,
    pick: true,
    locales: [{ p: [0, 1.12, 0.46], r: 0.12 }],
  });

  piezas.push({
    geo: redondeada(0.16, 0.72, 1.05, 0.06),
    mat: materialBrazos(),
    color: 'brazos',
    glow: true,
    locales: [
      { p: [-0.66, 0.46, 0.02], r: 0 },
      { p: [0.66, 0.46, 0.02], r: 0 },
    ],
  });

  piezas.push({
    geo: aro(),
    mat: new THREE.MeshBasicMaterial({ color: new THREE.Color('#4fa3e0').multiplyScalar(2.2) }),
    color: 'cuerpo',
    shadow: false,
    locales: [{ p: [0.66, 0.83, -0.36], r: 0 }],
  });

  return piezas;
}

// Butaca VIP: más alta, con reposapiés, respaldo doble y dos posavasos.
function modeloVip(): DefPieza[] {
  const piezas: DefPieza[] = [];

  piezas.push({
    geo: redondeada(1.14, 0.36, 1.1, 0.12),
    mat: materialCuerpo(),
    color: 'cuerpo',
    glow: true,
    pick: true,
    locales: [{ p: [0, 0.52, -0.08], r: 0 }],
  });

  piezas.push({
    geo: redondeada(1.16, 1.35, 0.36, 0.14),
    mat: materialCuerpo(),
    color: 'cuerpo',
    glow: true,
    pick: true,
    locales: [{ p: [0, 1.15, 0.55], r: 0.18 }],
  });

  piezas.push({
    geo: redondeada(0.9, 0.34, 0.2, 0.09),
    mat: materialCuerpo(),
    color: 'cuerpo',
    glow: true,
    locales: [{ p: [0, 1.74, 0.43], r: 0.18 }],
  });

  piezas.push({
    geo: redondeada(1.0, 0.22, 0.42, 0.08),
    mat: materialCuerpo(),
    color: 'cuerpo',
    glow: true,
    locales: [{ p: [0, 0.36, -0.8], r: -0.35 }],
  });

  piezas.push({
    geo: redondeada(0.2, 0.8, 1.25, 0.08),
    mat: materialBrazos(),
    color: 'brazos',
    glow: true,
    locales: [
      { p: [-0.68, 0.5, 0], r: 0 },
      { p: [0.68, 0.5, 0], r: 0 },
    ],
  });

  piezas.push({
    geo: aro(),
    mat: new THREE.MeshBasicMaterial({ color: new THREE.Color('#f5c542').multiplyScalar(2.4) }),
    color: 'cuerpo',
    shadow: false,
    locales: [
      { p: [-0.68, 0.915, -0.42], r: 0 },
      { p: [0.68, 0.915, -0.42], r: 0 },
    ],
  });

  return piezas;
}

// Parchea un material para que cada instancia pueda brillar por su cuenta.
function conBrilloPropio(mat: THREE.Material): THREE.Material {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aGlow;\nvarying vec3 vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlow;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vGlow;',
      );
  };

  return mat;
}

function materialCuerpo(): THREE.Material {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.78,
    sheen: 0.7,
    sheenColor: new THREE.Color(0xc9b3a6),
    sheenRoughness: 0.5,
  });

  return conBrilloPropio(mat);
}

function materialBrazos(): THREE.Material {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.25,
  });

  return conBrilloPropio(mat);
}

function redondeada(ancho: number, alto: number, fondo: number, radio: number): THREE.BufferGeometry {
  const geo = new RoundedBoxGeometry(ancho, alto, fondo, 3, radio);

  return geo;
}

function aro(): THREE.BufferGeometry {
  const geo = new THREE.TorusGeometry(0.07, 0.018, 6, 16);
  geo.rotateX(Math.PI / 2);

  return geo;
}

function atributoDeBrillo(pieza: PiezaButaca): THREE.InstancedBufferAttribute | null {
  let atributo: THREE.InstancedBufferAttribute | null = null;

  if (pieza.def.glow === true) {
    const encontrado = pieza.malla.geometry.getAttribute('aGlow');

    if (encontrado instanceof THREE.InstancedBufferAttribute) {
      atributo = encontrado;
    }
  }

  return atributo;
}

function matrizDeTraslacion(x: number, y: number, z: number): THREE.Matrix4 {
  const matriz = new THREE.Matrix4();
  matriz.makeTranslation(x, y, z);

  return matriz;
}

function matrizDeLocal(local: PosicionLocal): THREE.Matrix4 {
  const posicion = new THREE.Vector3(local.p[0], local.p[1], local.p[2]);
  const rotacion = new THREE.Quaternion();
  const escala = new THREE.Vector3(1, 1, 1);
  const matriz = new THREE.Matrix4();

  rotacion.setFromEuler(new THREE.Euler(local.r, 0, 0));
  matriz.compose(posicion, rotacion, escala);

  return matriz;
}

function suavizar(k: number): number {
  let valor = 0;

  if (k < 0.5) {
    valor = 4 * k * k * k;
  } else {
    valor = 1 - Math.pow(-2 * k + 2, 3) / 2;
  }

  return valor;
}

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

// La sala entera se arma una sola vez, así que al salir de la pantalla hay que
// devolver las geometrías y los materiales a la GPU.
function liberarEscena(scene: THREE.Scene): void {
  scene.traverse((objeto) => {
    const mesh = objeto as THREE.Mesh;
    const geo = mesh.geometry;

    if (geo !== undefined) {
      geo.dispose();
    }

    const material = mesh.material;

    if (material === undefined) {
      return;
    }

    if (Array.isArray(material)) {
      for (const mat of material) {
        mat.dispose();
      }

      return;
    }

    material.dispose();
  });
}

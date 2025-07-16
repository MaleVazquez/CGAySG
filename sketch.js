
let imagenes = {};
let tono = 'original';
let mic, fft;
let estado = 'esperando';

const amplitudeThreshold = 0.001;
const minAgudoEnergy = 1;
const maxAgudoEnergy = 8.5;
const minMedioEnergy = 45;
const maxMedioEnergy = 120;
const minGraveEnergy = 170;
const toneHoldDuration = 200;
let lastToneChangeTime = 0;
let marcoAncho = 260; 
let marcoAlto = 260;  

let offset = { x: 0, y: 0 };

function preload() {
  imagenes.azul = loadImage('data/azul.png');
  imagenes.azuloscuro = loadImage('data/azuloscuro.png');
  imagenes.rojo = loadImage('data/rojo.png');
  imagenes.rojooscuro = loadImage('data/rojooscuro.png');
  imagenes.amarillo = loadImage('data/amarillo.png');
  imagenes.amarilloscuro = loadImage('data/amarilloscuro.png');
  imagenes.verde = loadImage('data/verde.png');
  imagenes.verdeoscuro = loadImage('data/verdeoscuro.png');
}

function setup() {
  const canvas = createCanvas(550, 550);
  canvas.parent("main");
  imageMode(CENTER);
  background(255);
  noStroke();

  mic = new p5.AudioIn();
  fft = new p5.FFT(0.8, 1024);
  fft.setInput(mic);
}

function draw() {
  background(255);

  const marcoX = 290;
  const marcoY = height / 2;

  // === SOMBRA EXTERIOR ===
  push();
  noStroke();
  fill(200, 80);
  rectMode(CENTER);
  rect(marcoX + 3, marcoY + 3, 500, 500); // reducido de 580
  pop();

  // === MARCO EXTERIOR BLANCO ===
  push();
  fill(255);
  stroke(220);
  strokeWeight(8);
  rectMode(CENTER);
  rect(marcoX, marcoY, 520, 520); // reducido de 600
  pop();

  // === MARCO INTERIOR (biselado) ===
  push();
  fill(255);
  stroke(230);
  strokeWeight(4);
  rectMode(CENTER);
  rect(marcoX, marcoY, 380, 380); // reducido de 420
  pop();

  // === FONDO INTERIOR (color papel) ===
  push();
  fill(219, 216, 201);
  rectMode(CENTER);
  rect(marcoX, marcoY, marcoAncho, marcoAlto);
  pop();

  if (estado === 'esperando') {
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('Haz clic para activar el micrófono 🎤', marcoX, marcoY);
    return;
  }

  fft.analyze();
  let level = mic.getLevel();
  let bass = fft.getEnergy('bass');
  let mid = fft.getEnergy('mid');
  let treble = fft.getEnergy('treble');


  // === Detectar tono ===

  let nuevoTono = 'original';
  if (level > amplitudeThreshold) {
    if (treble > minAgudoEnergy && treble < maxAgudoEnergy) {
      nuevoTono = 'agudo';
    } else if (bass > minGraveEnergy) {
      nuevoTono = 'grave';
    } else if (mid > minMedioEnergy && mid < maxMedioEnergy) {
      nuevoTono = 'medio';
    }
  }

  if (nuevoTono !== tono && millis() - lastToneChangeTime > toneHoldDuration) {
    tono = nuevoTono;
    lastToneChangeTime = millis();
  }

  // === Asignar imagen y color según tono ===

  let baseImg, overlayImg, baseTint, overlayTint;

  switch (tono) {
    case 'grave':
      baseImg = imagenes.rojo;
      overlayImg = imagenes.rojooscuro;
      baseTint = color(220, 60, 50);
      overlayTint = color(130, 20, 30);
      break;
    case 'medio':
      baseImg = imagenes.amarillo;
      overlayImg = imagenes.amarilloscuro;
      baseTint = color(250, 200, 50);
      overlayTint = color(190, 150, 10);
      break;
    case 'agudo':
      baseImg = imagenes.verde;
      overlayImg = imagenes.verdeoscuro;
      baseTint = color(30, 190, 90);
      overlayTint = color(20, 100, 60);
      break;
    default:
      baseImg = imagenes.azul;
      overlayImg = imagenes.azuloscuro;
      baseTint = color(20, 80, 200);
      overlayTint = color(10, 30, 120);
  }

  // === Obtener vibración si volumen alto ===

  let vibracion = obtenerVibracion(level);

  // === DIBUJAR IMAGEN BASE ===
  push();
  tint(ajustarBrillo(baseTint, level));
  image(baseImg, marcoX + vibracion.x, marcoY + vibracion.y);
  pop();


  // === Posición del overlay según tono ===

  switch (tono) {
    case 'grave':
      offset = { x: 44, y: -80.2 };
      break;
    case 'medio':
      offset = { x: 90, y: -5 };
      break;
    case 'agudo':
      offset = { x: 84, y: 42 };
      break;
    default:
      offset = { x: 33.5, y: -67 };
      break;
  }

// === TEXTO DEBUG ===
  /*fill(0);
  noStroke();
  textSize(14);
  textAlign(LEFT, TOP);
  text(`Nivel: ${level.toFixed(3)}`, 10, 10);
  text(`Grave: ${bass.toFixed(0)} (Umbral > ${minGraveEnergy})`, 10, 30);
  text(`Medio: ${mid.toFixed(0)} (Rango: ${minMedioEnergy}-${maxMedioEnergy})`, 10, 50);
  text(`Agudo: ${treble.toFixed(0)} (Rango: ${minAgudoEnergy}-${maxAgudoEnergy})`, 10, 70);
  text(`TONO DETECTADO: ${tono.toUpperCase()}`, 10, 100);*/


  // === DIBUJAR OVERLAY CON VIBRACIÓN ===

  push();
  translate(marcoX + offset.x + vibracion.x, marcoY + offset.y + vibracion.y);
  let escalaOverlay = 1.135;
  scale(escalaOverlay);
  tint(ajustarBrillo(overlayTint, level));
  image(overlayImg, 0, 0);
  pop();
}

// === ACTIVAR MICRÓFONO ===

function mousePressed() {
  if (estado === 'esperando') {
    userStartAudio().then(() => {
      mic.start();
      estado = 'activo';
    }).catch(err => {
      console.error('Error al activar audio:', err);
    });
  }
}

// === BRILLO SEGÚN VOLUMEN ===

function ajustarBrillo(colorBase, volumen) {
  let factorBrillo;

  if (volumen < 0.008) {
    factorBrillo = 0.6;
  } else if (volumen <= 0.05) {
    factorBrillo = map(volumen, 0.008, 0.05, 0.6, 1.5, true);
  } else {
    factorBrillo = map(volumen, 0.05, 0.15, 1.5, 2.2, true);
  }

  let r = red(colorBase) * factorBrillo;
  let g = green(colorBase) * factorBrillo;
  let b = blue(colorBase) * factorBrillo;

  return color(constrain(r, 0, 255), constrain(g, 0, 255), constrain(b, 0, 255));
}

function obtenerVibracion(level) {
  if (level > 0.20) {
    let intensidad = map(level, 0.25, 1, 1, 10, true);
    return {
      x: random(-intensidad, intensidad),
      y: random(-intensidad, intensidad)
    };
  } else {
    return { x: 0, y: 0 };
  }
}

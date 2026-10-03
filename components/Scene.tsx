"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Reveal } from "@/lib/reveal";

const W = 3.4;
const H = 2.2;
const FLAP = H * 0.56;
const REST_Y = -0.4;
const TILT = -0.85;
const LW = 4.2; // landscape letter
const LH = 3.0;
const FALL_AT = 1.0;
const FALL_DUR = 1.3;
const LIFT_AT = 0.2; // seconds after click: envelope swoops up and spins over
const LIFT_DUR = 1.1;
const SHAKE_AT = 1.3; // it hangs upside down and shakes the letter out
const REL = 3.6; // letter is released
const FLY = 2.1; // letter tumbles to the front and rights itself

const { damp, clamp, lerp, smoothstep: smooth, smootherstep, degToRad } = THREE.MathUtils;

/* ---------------- Invite texture (landscape) ---------------- */
function drawInvite(c: HTMLCanvasElement, d: string, b: string, names: string, address: string[], reveal: Reveal) {
  if (reveal) return drawReveal(c, d, b, names, reveal);
  const g = c.getContext("2d")!;
  const w = c.width;
  const h = c.height;
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#f4e7c4");
  bg.addColorStop(1, "#e6cd98");
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62);
  vg.addColorStop(0, "rgba(120,80,20,0)");
  vg.addColorStop(1, "rgba(120,80,20,0.4)");
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#c49a45";
  g.lineWidth = 6;
  g.strokeRect(46, 46, w - 92, h - 92);
  g.lineWidth = 2;
  g.strokeRect(68, 68, w - 136, h - 136);
  g.textAlign = "center";
  const star = (x: number, y: number, r: number) => {
    g.fillStyle = "#c49a45";
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rr = i % 2 ? r * 0.3 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  for (const [cx, cy] of [[68, 68], [w - 68, 68], [68, h - 68], [w - 68, h - 68]]) star(cx, cy, 30);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(110,70,20,${Math.random() * 0.05})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 40, 1);
  }

  const BURG = "#740001";
  const INK = "#2b1a0e";
  const body = (px: number, it = false) => `${it ? "italic " : ""}${px}px ${b}, Georgia, serif`;
  const text = (t: string, x: number, y: number, font: string, color: string) => {
    g.font = font;
    g.fillStyle = color;
    g.fillText(t, x, y);
  };
  const wrap = (t: string, x: number, y: number, font: string, max: number, lh: number) => {
    g.font = font;
    g.fillStyle = INK;
    let line = "";
    for (const word of t.split(" ")) {
      const test = line ? line + " " + word : word;
      if (g.measureText(test).width > max && line) {
        g.fillText(line, x, y);
        line = word;
        y += lh;
      } else line = test;
    }
    g.fillText(line, x, y);
  };
  const rule = (x1: number, y1: number, x2: number, y2: number) => {
    const gr = g.createLinearGradient(x1, y1, x2, y2);
    gr.addColorStop(0, "rgba(196,154,69,0)");
    gr.addColorStop(0.5, "#c49a45");
    gr.addColorStop(1, "rgba(196,154,69,0)");
    g.strokeStyle = gr;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  };

  g.shadowColor = "rgba(196,154,69,0.7)";
  g.shadowOffsetY = 5;
  g.shadowBlur = 8;
  text("You're Invited!", w / 2, 240, `900 104px ${d}, serif`, BURG);
  g.shadowColor = "transparent";
  text("to our baby gender reveal", w / 2, 320, body(52, true), INK);
  rule(360, 372, w - 360, 372);
  star(w / 2, 372, 18);
  star(330, 300, 14);
  star(w - 330, 300, 14);

  const LX = 480;
  wrap(
    "We're expecting, and we'd love for you to celebrate with us as we find out if it's a boy or a girl. Join us for food, drinks, and good company.",
    LX, 480, body(44), 700, 66,
  );
  text("With love,", LX, 820, body(44), INK);
  text(names, LX, 884, body(50, true), INK);

  rule(860, 440, 860, 1060);
  star(860, 750, 14);

  const RX = 1260;
  text("When", RX, 510, `700 46px ${d}, serif`, BURG);
  text("Sunday, 25 October 2026", RX, 578, body(44), INK);
  text("12 PM to 3 PM", RX, 638, body(44), INK);
  text("Where", RX, 810, `700 46px ${d}, serif`, BURG);
  address.forEach((l, i) => text(l, RX, 878 + i * 58, body(44), INK));
}

/* ---------------- Reveal letter (from 25 Oct) ---------------- */
const THEMES = {
  boy: { a: "#eaf3fd", b: "#b7d2f0", line: "#5a8fd0", main: "#1f4a82", ink: "#16304f", word: "Boy", tint: "40,90,170" },
  girl: { a: "#fdebf2", b: "#f0bace", line: "#d9688a", main: "#8a2146", ink: "#4a1426", word: "Girl", tint: "180,60,100" },
};

function drawReveal(c: HTMLCanvasElement, d: string, b: string, names: string, reveal: "boy" | "girl") {
  const g = c.getContext("2d")!;
  const w = c.width;
  const h = c.height;
  const th = THEMES[reveal];
  const bg = g.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, th.a);
  bg.addColorStop(1, th.b);
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.62);
  vg.addColorStop(0, `rgba(${th.tint},0)`);
  vg.addColorStop(1, `rgba(${th.tint},0.28)`);
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = th.line;
  g.lineWidth = 6;
  g.strokeRect(46, 46, w - 92, h - 92);
  g.lineWidth = 2;
  g.strokeRect(68, 68, w - 136, h - 136);
  g.textAlign = "center";

  const star = (x: number, y: number, r: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const rr = i % 2 ? r * 0.3 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fill();
  };
  for (const [cx, cy] of [[68, 68], [w - 68, 68], [68, h - 68], [w - 68, h - 68]]) star(cx, cy, 30, th.line);

  // confetti around the edges (seeded so repaints match)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = 100 + rnd() * (w - 200);
    const y = 100 + rnd() * (h - 200);
    const r = 5 + rnd() * 9;
    if (x > 230 && x < w - 230 && y > 150 && y < h - 150) continue;
    g.globalAlpha = 0.55;
    if (i % 3 === 0) star(x, y, r * 1.8, "#d4a24a");
    else {
      g.fillStyle = i % 3 === 1 ? th.line : "#e2b95f";
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  g.shadowColor = "rgba(212,162,74,0.7)";
  g.shadowOffsetY = 6;
  g.shadowBlur = 10;
  g.fillStyle = th.main;
  g.font = `900 170px ${d}, serif`;
  g.fillText(`It's a ${th.word}!`, w / 2, 330);
  g.shadowColor = "transparent";

  g.fillStyle = th.ink;
  g.font = `italic 58px ${b}, Georgia, serif`;
  g.fillText("Thank you for celebrating with us", w / 2, 440);

  const gr = g.createLinearGradient(360, 0, w - 360, 0);
  gr.addColorStop(0, "rgba(196,154,69,0)");
  gr.addColorStop(0.5, "#c49a45");
  gr.addColorStop(1, "rgba(196,154,69,0)");
  g.strokeStyle = gr;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(360, 500);
  g.lineTo(w - 360, 500);
  g.stroke();
  star(w / 2, 500, 18, "#c49a45");

  g.font = `46px ${b}, Georgia, serif`;
  const lines = [
    "Your love, laughter and joy made our reveal day unforgettable.",
    `We can't wait to meet our little ${reveal}, and to share`,
    "every moment of this adventure with you.",
  ];
  lines.forEach((l, i) => g.fillText(l, w / 2, 600 + i * 66));
  g.font = `italic 50px ${b}, Georgia, serif`;
  g.fillText(`With love, ${names}`, w / 2, 900);
}

function useInvite(names: string, address: string[], reveal: Reveal) {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1680;
    c.height = 1200;
    return c;
  }, []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);

  useEffect(() => {
    const cs = getComputedStyle(document.body);
    const d = cs.getPropertyValue("--f-display") || "serif";
    const b = cs.getPropertyValue("--f-body") || "Georgia";
    const paint = () => {
      drawInvite(canvas, d, b, names, address, reveal);
      tex.needsUpdate = true;
    };
    paint();
    Promise.all([
      document.fonts.load(`900 104px ${d}`),
      document.fonts.load(`700 46px ${d}`),
      document.fonts.load(`44px ${b}`),
      document.fonts.load(`italic 44px ${b}`),
    ]).then(paint).catch(() => {});
  }, [canvas, tex, names, address, reveal]);

  return tex;
}

/* ---------------- Stars ---------------- */
function Stars() {
  const group = useRef<THREE.Group>(null!);
  const mats = useRef<THREE.PointsMaterial[]>([]);
  const sprite = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.3, "rgba(255,255,255,0.6)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }, []);
  const layers = useMemo(
    () =>
      [
        { n: 2400, size: 0.5, color: "#ffffff" },
        { n: 300, size: 1.1, color: "#a9c2ff" },
      ].map(({ n, size, color }) => {
        const p = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const r = 30 + Math.random() * 90;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          p[i * 3] = r * Math.sin(ph) * Math.cos(th);
          p[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
          p[i * 3 + 2] = r * Math.cos(ph);
        }
        return { p, size, color };
      }),
    [],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    group.current.rotation.y += dt * 0.012;
    group.current.rotation.x += dt * 0.004;
    const f = clamp((t - 0.4) / 2.5, 0, 1);
    if (mats.current[0]) mats.current[0].opacity = f * 0.9;
    if (mats.current[1]) mats.current[1].opacity = f * (0.65 + 0.35 * Math.sin(t * 1.7));
  });

  return (
    <group ref={group}>
      {layers.map((l, i) => (
        <points key={i} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[l.p, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            map={sprite}
            size={l.size}
            color={l.color}
            transparent
            opacity={0}
            depthWrite={false}
            sizeAttenuation
          />
        </points>
      ))}
    </group>
  );
}

/* ---------------- Textures ---------------- */
const mk = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
const toTex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
let glowTex: THREE.CanvasTexture | null = null;
const glow = () => {
  if (glowTex) return glowTex;
  const c = mk(128, 128);
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.3, "rgba(255,255,255,0.45)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return (glowTex = toTex(c));
};
const grain = (g: CanvasRenderingContext2D, w: number, h: number, a: number) => {
  for (let i = 0; i < (w * h) / 80; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? "60,35,10" : "255,245,210"},${Math.random() * a})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1);
  }
};
const fillV = (g: CanvasRenderingContext2D, w: number, h: number, a: string, b: string) => {
  const gr = g.createLinearGradient(0, 0, w * 0.3, h);
  gr.addColorStop(0, a);
  gr.addColorStop(1, b);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
};
const mapUV = (geo: THREE.BufferGeometry, ox: number, oy: number, w: number, h: number) => {
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - ox) / w, (p.getY(i) - oy) / h);
  uv.needsUpdate = true;
  return geo;
};

function useEnvTextures() {
  return useMemo(() => {
    const TW = 1024;
    const TH = Math.round((TW * H) / W);
    const FH = Math.round((TW * FLAP) / W);
    const liner = (w: number, h: number) => {
      const c = mk(w, h);
      const g = c.getContext("2d")!;
      fillV(g, w, h, "#5a0001", "#8e1316");
      g.strokeStyle = "rgba(212,162,74,0.22)";
      g.lineWidth = 2;
      for (let x = 0; x < w + h; x += 56) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x - h, h);
        g.moveTo(x - h, 0);
        g.lineTo(x, h);
        g.stroke();
      }
      grain(g, w, h, 0.12);
      return toTex(c);
    };
    const back = mk(TW, TH);
    {
      const g = back.getContext("2d")!;
      fillV(g, TW, TH, "#c4a064", "#a97d44");
      grain(g, TW, TH, 0.18);
    }
    const pocket = mk(TW, TH);
    {
      const g = pocket.getContext("2d")!;
      const tip = (FLAP / H) * TH;
      fillV(g, TW, TH, "#dbbb82", "#c8a062");
      const tri = (pts: number[][], col: string) => {
        g.fillStyle = col;
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.fill();
      };
      tri([[0, 0], [TW / 2, tip], [0, TH]], "rgba(120,80,30,0.16)");
      tri([[TW, 0], [TW / 2, tip], [TW, TH]], "rgba(90,55,20,0.24)");
      tri([[0, TH], [TW / 2, tip], [TW, TH]], "rgba(255,240,200,0.20)");
      g.strokeStyle = "rgba(255,238,190,0.75)";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(0, TH);
      g.lineTo(TW / 2, tip);
      g.lineTo(TW, TH);
      g.stroke();
      g.strokeStyle = "rgba(212,162,74,0.9)";
      g.lineWidth = 5;
      g.setLineDash([18, 12]);
      g.strokeRect(22, 22, TW - 44, TH - 44);
      grain(g, TW, TH, 0.16);
    }
    const flapFront = mk(TW, FH);
    {
      const g = flapFront.getContext("2d")!;
      fillV(g, TW, FH, "#d3ac6e", "#b88a4c");
      g.strokeStyle = "rgba(212,162,74,0.9)";
      g.lineWidth = 5;
      g.setLineDash([18, 12]);
      g.beginPath();
      g.moveTo(60, 18);
      g.lineTo(TW / 2, FH - 70);
      g.lineTo(TW - 60, 18);
      g.stroke();
      grain(g, TW, FH, 0.16);
    }
    const seal = mk(256, 256);
    {
      const g = seal.getContext("2d")!;
      const gr = g.createRadialGradient(100, 96, 8, 128, 128, 126);
      gr.addColorStop(0, "#b3171d");
      gr.addColorStop(0.7, "#740001");
      gr.addColorStop(1, "#4a0000");
      g.fillStyle = gr;
      g.beginPath();
      g.arc(128, 128, 126, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(255,190,150,0.55)";
      g.lineWidth = 6;
      g.beginPath();
      g.arc(128, 128, 98, 0, Math.PI * 2);
      g.stroke();
      const star = (dx: number, dy: number, col: string) => {
        g.fillStyle = col;
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 ? 22 : 62;
          g.lineTo(128 + dx + Math.cos(a) * r, 128 + dy + Math.sin(a) * r);
        }
        g.closePath();
        g.fill();
      };
      star(-2, -2, "rgba(40,0,0,0.55)");
      star(2, 2, "rgba(255,200,170,0.35)");
      star(0, 0, "#d9a94c");
    }
    return {
      body: liner(TW, TH),
      flapBack: liner(TW, FH),
      back: toTex(back),
      pocket: toTex(pocket),
      flapFront: toTex(flapFront),
      seal: toTex(seal),
    };
  }, []);
}

/* ---------------- Backdrop glow and sparks ---------------- */
const NEBULAE: [number, number, number, number, string, number][] = [
  [-32, 16, -70, 100, "#5b2a9e", 0.2],
  [40, -20, -80, 110, "#1c3f8f", 0.24],
  [0, -34, -90, 120, "#8a2c3c", 0.14],
];

function Backdrop({ pulse }: { pulse: MutableRefObject<number> }) {
  const halo = useRef<THREE.Sprite>(null!);
  const map = useMemo(glow, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const m = halo.current.material as THREE.SpriteMaterial;
    m.opacity = clamp((t - 0.3) / 2, 0, 1) * (0.32 + 0.05 * Math.sin(t * 1.3) + pulse.current * 0.35);
    halo.current.scale.setScalar(13 + pulse.current * 4);
  });
  return (
    <>
      {NEBULAE.map(([x, y, z, s, c, o], i) => (
        <sprite key={i} position={[x, y, z]} scale={[s, s, 1]}>
          <spriteMaterial map={map} color={c} opacity={o} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
      <sprite ref={halo} position={[0, 0.6, -3]}>
        <spriteMaterial map={map} color="#e0a640" opacity={0} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </>
  );
}

type Burst = MutableRefObject<THREE.Vector3 | null>;
const NS = 240;

function Sparks({ burst }: { burst: Burst }) {
  const pts = useRef<THREE.Points>(null!);
  const map = useMemo(glow, []);
  const st = useMemo(
    () => ({ pos: new Float32Array(NS * 3), vel: new Float32Array(NS * 3), col: new Float32Array(NS * 3), life: new Float32Array(NS) }),
    [],
  );
  useFrame((_, dt) => {
    const at = burst.current;
    if (at) {
      burst.current = null;
      for (let i = 0; i < NS; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * 5;
        st.pos.set([at.x, at.y, at.z], i * 3);
        st.vel.set([Math.cos(a) * sp, Math.sin(a) * sp * 0.8 + 1.5, (Math.random() - 0.3) * sp], i * 3);
        st.life[i] = 0.6 + Math.random() * 0.9;
      }
    }
    for (let i = 0; i < NS; i++) {
      const l = st.life[i];
      if (l > 0) {
        for (let k = 0; k < 3; k++) {
          st.pos[i * 3 + k] += st.vel[i * 3 + k] * dt;
          st.vel[i * 3 + k] *= 0.97;
        }
        st.vel[i * 3 + 1] -= 2.2 * dt;
        st.life[i] = l - dt * 0.7;
      }
      const f = clamp(st.life[i], 0, 1);
      st.col[i * 3] = f;
      st.col[i * 3 + 1] = f * 0.8;
      st.col[i * 3 + 2] = f * 0.45;
    }
    const a = pts.current.geometry.attributes;
    a.position.needsUpdate = true;
    a.color.needsUpdate = true;
  });
  return (
    <points ref={pts} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[st.pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[st.col, 3]} />
      </bufferGeometry>
      <pointsMaterial map={map} size={0.4} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

/* ---------------- Envelope and letter ---------------- */
type SceneProps = {
  opened: boolean;
  hovered: MutableRefObject<boolean>;
  onOpen: () => void;
  onSettled: () => void;
  names: string;
  address: string[];
  reveal: Reveal;
};

const tmpE = new THREE.Euler();
const tmpQ = new THREE.Quaternion();
const tmpQ2 = new THREE.Quaternion();
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

function Stage({ opened, hovered, onOpen, onSettled, names, address, reveal }: SceneProps) {
  const { viewport, camera, size } = useThree();
  const stageScale = Math.min(0.85, (viewport.width * 0.7) / W);

  const root = useRef<THREE.Group>(null!);
  const flap = useRef<THREE.Group>(null!);
  const seal = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Mesh>(null!);
  const big = useRef<THREE.Mesh>(null!);
  const openAt = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number; rx: number; rz: number } | null>(null);
  const released = useRef(false);
  const done = useRef(false);
  const rel = useRef({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() });
  const v = useRef({ angle: 0, shake: 0, seal: 1 });
  const burst: Burst = useRef(null);
  const pulse = useRef(0);
  const invite = useInvite(names, address, reveal);
  const T = useEnvTextures();

  const pocket = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-W / 2, H / 2);
    s.lineTo(0, H / 2 - FLAP);
    s.lineTo(W / 2, H / 2);
    s.lineTo(W / 2, -H / 2);
    s.lineTo(-W / 2, -H / 2);
    s.closePath();
    return mapUV(new THREE.ShapeGeometry(s), -W / 2, -H / 2, W, H);
  }, []);
  const flapGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0);
    s.lineTo(W / 2, 0);
    s.lineTo(0, -FLAP);
    s.closePath();
    return mapUV(new THREE.ShapeGeometry(s), -W / 2, -FLAP, W, FLAP);
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const s = v.current;
    const g = root.current;
    if (opened && openAt.current === null) openAt.current = t;
    const ot = openAt.current === null ? -1 : t - openAt.current;

    /* intro (unchanged): envelope falls out of the sky and tumbles to rest */
    let x = 0;
    let y = 9;
    let rx = 0;
    let rz = 0;
    if (t >= FALL_AT) {
      const p = clamp((t - FALL_AT) / FALL_DUR, 0, 1);
      y = lerp(9, REST_Y, p * p);
      x = Math.sin(p * Math.PI * 2) * 0.7 * (1 - p);
      rx = TILT * smooth(p, 0, 1);
      rz = Math.sin(p * Math.PI * 1.5) * 0.6 * (1 - p);
      const q = t - (FALL_AT + FALL_DUR);
      if (q > 0) y += Math.max(0, Math.sin(q * 9)) * 0.25 * Math.exp(-q * 4);
    }
    g.visible = t >= FALL_AT - 0.05;

    const shaking = t > FALL_AT + FALL_DUR + 0.9 && !opened && !hovered.current;
    s.shake = damp(s.shake, shaking ? Math.max(0, Math.sin(t * 8)) * 0.07 : 0, 12, dt);
    rz += Math.sin(t * 40) * s.shake;

    let ly = 0;
    if (ot < 0) {
      g.position.set(x, y, 0);
      g.rotation.set(rx, 0, rz);
    } else {
      /* click: the envelope swoops up, spins over, then shakes the letter out */
      if (!start.current) start.current = { x, y, rx, rz };
      const a = start.current;
      const e = smootherstep(clamp((ot - LIFT_AT) / LIFT_DUR, 0, 1), 0, 1);
      const arc = Math.sin(e * Math.PI);
      const ta = ot - REL;
      const amp = smooth(ot, SHAKE_AT - 0.2, SHAKE_AT + 0.7) * (ta < 0 ? 1 : Math.exp(-ta * 3.5));
      let px = lerp(a.x, 0, e) + arc * 0.9 + Math.sin(ot * 9) * 0.1 * amp;
      let py = lerp(a.y, 1.55, e) + arc * 0.7 + Math.sin(ot * 7 + 2) * 0.06 * amp;
      let pz = lerp(0, 1.8, e) + arc * 0.9;
      let rZ = lerp(a.rz, Math.PI, e) + Math.sin(ot * 8 + 1) * 0.14 * amp;
      if (ta > 0) {
        py += ta * ta * 3.4;
        px += ta * 0.8;
        pz -= ta * 3;
        rZ += ta * 2.2;
      }
      g.position.set(px, py, pz);
      g.rotation.set(lerp(a.rx, -0.3, e) + Math.sin(ot * 6) * 0.08 * amp, e * Math.PI * 2, rZ);
      g.scale.setScalar(ta > 0 ? Math.max(1 - smooth(ta, 0, 1.9) * 0.97, 0.0001) : 1);
      g.visible = ta < 2;

      const sp = clamp((ot - SHAKE_AT) / (REL - SHAKE_AT), 0, 1);
      ly = 0.3 * smooth(ot, 0.8, SHAKE_AT) + 1.6 * smooth(sp, 0, 1) + (0.5 + 0.5 * Math.sin(ot * 7)) * 0.1 * amp * (1 - sp * sp);
      inner.current.rotation.z = Math.sin(ot * 6) * 0.05 * amp;
    }

    /* flap: halfway on hover, fully open on click */
    const target = opened ? 3.05 : hovered.current ? 1.35 : 0;
    s.angle = damp(s.angle, target, opened ? 8 : 10, dt);
    flap.current.rotation.x = -s.angle;
    flap.current.position.z = s.angle > 1.6 ? -0.02 : 0.09;
    s.seal = damp(s.seal, opened ? 0 : 1, 12, dt);
    seal.current.scale.setScalar(Math.max(s.seal, 0.0001));

    inner.current.position.set(0, ly, 0.03 + smooth(ly, 0.9, 1.7) * 0.5);

    /* letter leaves the envelope */
    const bg = big.current;
    if (ot >= REL && !released.current) {
      released.current = true;
      inner.current.updateWorldMatrix(true, false);
      inner.current.matrixWorld.decompose(rel.current.p, rel.current.q, rel.current.s);
      bg.position.copy(rel.current.p);
      bg.quaternion.copy(rel.current.q);
      bg.scale.copy(rel.current.s);
      bg.visible = true;
      inner.current.visible = false;
      burst.current = rel.current.p.clone();
    }
    pulse.current = damp(pulse.current, ot < 0 ? 0 : ot < SHAKE_AT ? 0.3 : ot < REL ? 0.8 : ot < REL + 0.6 ? 1.4 : 0.3, 6, dt);

    /* letter tumbles to the front, then rights itself and floats upright */
    if (released.current) {
      const r = rel.current;
      const p = clamp((ot - REL) / FLY, 0, 1);
      const e = smootherstep(p, 0, 1);
      const w = (1 - p) * (1 - p);
      const persp = camera as THREE.PerspectiveCamera;
      const k = 2 * Math.tan(degToRad(persp.fov / 2));
      const asp = size.width / size.height;
      const fs = Math.min((0.7 * k * 5.5) / LH, (0.92 * k * 5.5 * asp) / LW);
      camera.getWorldDirection(tmpDir);
      tmpV.copy(camera.position).addScaledVector(tmpDir, 5.5).addScaledVector(camera.up, 0.25 + Math.sin(t * 1.6) * 0.04 * e);
      tmpV2.lerpVectors(r.p, tmpV, e);
      tmpV2.y -= 0.8 * Math.sin(Math.PI * p) * (1 - p);
      tmpV2.x += Math.sin(p * Math.PI * 3) * 0.5 * (1 - p);
      bg.position.copy(tmpV2);
      tmpQ.slerpQuaternions(r.q, camera.quaternion, e);
      tmpE.set(Math.sin(p * Math.PI * 3.5) * 0.7 * w, Math.cos(p * Math.PI * 3) * 0.9 * w, Math.sin(p * Math.PI * 2) * 0.4 * w);
      bg.quaternion.copy(tmpQ.multiply(tmpQ2.setFromEuler(tmpE)));
      bg.scale.setScalar(lerp(r.s.x, fs, e));
      if (ot > REL + FLY + 0.2 && !done.current) {
        done.current = true;
        onSettled();
      }
    }
  });

  const letterGeo = <planeGeometry args={[LW, LH]} />;
  const letterMat = <meshBasicMaterial map={invite} side={THREE.DoubleSide} toneMapped={false} />;

  return (
    <>
      <Backdrop pulse={pulse} />
      <group scale={stageScale}>
        <group
          ref={root}
          onClick={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "auto";
            onOpen();
          }}
          onPointerOver={() => {
            hovered.current = true;
            if (!opened) document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            hovered.current = false;
            document.body.style.cursor = "auto";
          }}
        >
          <mesh>
            <planeGeometry args={[W, H]} />
            <meshStandardMaterial map={T.body} roughness={0.9} />
          </mesh>
          <mesh>
            <planeGeometry args={[W, H]} />
            <meshStandardMaterial map={T.back} roughness={0.9} side={THREE.BackSide} />
          </mesh>
          <mesh ref={inner} position={[0, 0, 0.03]} scale={0.5}>
            {letterGeo}
            {letterMat}
          </mesh>
          <mesh geometry={pocket} position={[0, 0, 0.06]}>
            <meshStandardMaterial map={T.pocket} roughness={0.85} />
          </mesh>
          <group ref={flap} position={[0, H / 2, 0.09]}>
            <mesh geometry={flapGeo}>
              <meshStandardMaterial map={T.flapFront} roughness={0.85} side={THREE.FrontSide} />
            </mesh>
            <mesh geometry={flapGeo}>
              <meshStandardMaterial map={T.flapBack} roughness={0.9} side={THREE.BackSide} />
            </mesh>
            <group ref={seal} position={[0, -FLAP + 0.1, 0.03]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.21, 0.21, 0.04, 40]} />
                <meshStandardMaterial color="#5e0000" roughness={0.35} />
              </mesh>
              <mesh position={[0, 0, 0.021]}>
                <circleGeometry args={[0.2, 48]} />
                <meshStandardMaterial map={T.seal} roughness={0.3} metalness={0.15} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      <mesh ref={big} visible={false}>
        {letterGeo}
        {letterMat}
      </mesh>
      <Sparks burst={burst} />
    </>
  );
}

function Rig() {
  useFrame(({ camera, pointer }, dt) => {
    camera.position.x = damp(camera.position.x, pointer.x * 0.5, 3, dt);
    camera.position.y = damp(camera.position.y, 3.8 + pointer.y * 0.25, 3, dt);
    camera.lookAt(0, 0.4, 0);
  });
  return null;
}

export default function Scene(props: SceneProps) {
  return (
    <Canvas className="!absolute inset-0" camera={{ position: [0, 3.8, 9], fov: 40, near: 0.5, far: 400 }} dpr={[1, 2]}>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={1} />
      <directionalLight position={[3, 5, 5]} intensity={2.2} color="#ffe6b8" />
      <directionalLight position={[-4, 3, -5]} intensity={1.5} color="#8fa0ff" />
      <Rig />
      <Stars />
      <Stage {...props} />
    </Canvas>
  );
}

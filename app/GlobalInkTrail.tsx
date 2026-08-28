"use client";

import { useEffect, useRef } from "react";

type InkMark = { x: number; y: number; vx: number; vy: number; radius: number; life: number; maxLife: number; alpha: number; hue: number; kind: "mist" | "grain" };

export default function GlobalInkTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches) return;
    const possibleContext = canvas.getContext("2d", { alpha:true, desynchronized:true }); if (!possibleContext) return;
    const context: CanvasRenderingContext2D = possibleContext;
    let width = 0; let height = 0; let pixelRatio = 1; let frame = 0; let lastFrame = performance.now(); let awakened = false; let lastPoint: { x: number; y: number; time: number } | null = null; let marks: InkMark[] = [];
    const fadeDuration = 2100;
    const resize = () => { width = window.innerWidth; height = window.innerHeight; pixelRatio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio); canvas.style.width = `${width}px`; canvas.style.height = `${height}px`; context.setTransform(pixelRatio,0,0,pixelRatio,0,0); };
    const addMist = (x: number, y: number, speed: number, burst = false) => {
      const maxLife = fadeDuration * (.72 + Math.random() * .35); marks.push({ x:x + (Math.random() - .5) * (burst ? 24 : 13), y:y + (Math.random() - .5) * (burst ? 24 : 13), vx:(Math.random() - .5) * .12 - speed * .025, vy:(Math.random() - .5) * .1 - .018, radius:(burst ? 14 : 10) + Math.random() * (burst ? 34 : 26) + speed * 7, life:maxLife, maxLife, alpha:.035 + Math.random() * .07, hue:214 + Math.random() * 19, kind:"mist" });
    };
    const addGrain = (x: number, y: number, directionX: number, directionY: number, speed: number) => {
      const maxLife = 680 + Math.random() * 1000; marks.push({ x:x + (Math.random() - .5) * 16, y:y + (Math.random() - .5) * 16, vx:-directionX * speed * .13 + (Math.random() - .5) * .2, vy:-directionY * speed * .1 + (Math.random() - .5) * .16 - .02, radius:.4 + Math.random() * 1.25, life:maxLife, maxLife, alpha:.18 + Math.random() * .32, hue:216 + Math.random() * 18, kind:"grain" });
    };
    const ensureFrame = () => { if (!frame) { lastFrame = performance.now(); frame = window.requestAnimationFrame(draw); } };
    const emit = (x: number, y: number, fromX: number, fromY: number, elapsed: number, burst = false) => {
      const dx = x - fromX; const dy = y - fromY; const distance = Math.max(1, Math.hypot(dx,dy)); const directionX = dx / distance; const directionY = dy / distance; const speed = Math.min(1.4, distance / Math.max(8,elapsed)); const count = burst ? 14 : Math.min(18,Math.max(2,Math.ceil(distance / 6)));
      for (let index = 0; index < count; index += 1) { const progress = burst ? Math.random() : (index + 1) / count; const angle = burst ? Math.random() * Math.PI * 2 : 0; const spread = burst ? Math.random() * 20 : Math.sin((x + y + index * 11) * .035) * 4; const px = burst ? x + Math.cos(angle) * spread : fromX + dx * progress - directionY * spread; const py = burst ? y + Math.sin(angle) * spread : fromY + dy * progress + directionX * spread; addMist(px,py,speed,burst); if (index % 2 === 0 || burst) addGrain(px,py,directionX,directionY,speed); }
      if (marks.length > 360) marks.splice(0,marks.length - 360); ensureFrame();
    };
    function draw(time: number) {
      const delta = Math.min(34,Math.max(8,time - lastFrame)); lastFrame = time; const step = delta / 16.67; context.clearRect(0,0,width,height); const alive: InkMark[] = [];
      for (const mark of marks) { mark.life -= delta; if (mark.life <= 0) continue; mark.x += mark.vx * step; mark.y += mark.vy * step; mark.vx *= Math.pow(.987,step); mark.vy = mark.vy * Math.pow(.986,step) - .001 * step; mark.radius += mark.kind === "mist" ? .075 * step : 0; const age = 1 - mark.life / mark.maxLife; const fade = age < .08 ? age / .08 : Math.pow(Math.max(0,(1 - age) / .92),1.7); context.globalAlpha = mark.alpha * fade;
        if (mark.kind === "mist") { const gradient = context.createRadialGradient(mark.x,mark.y,0,mark.x,mark.y,mark.radius); gradient.addColorStop(0,`hsla(${mark.hue},72%,43%,.55)`); gradient.addColorStop(.42,`hsla(${mark.hue + 4},78%,55%,.2)`); gradient.addColorStop(1,`hsla(${mark.hue + 8},82%,66%,0)`); context.fillStyle = gradient; context.beginPath(); context.arc(mark.x,mark.y,mark.radius,0,Math.PI * 2); context.fill(); }
        else { context.fillStyle = `hsl(${mark.hue} 78% 49%)`; context.beginPath(); context.arc(mark.x,mark.y,mark.radius,0,Math.PI * 2); context.fill(); }
        alive.push(mark);
      }
      marks = alive; context.globalAlpha = 1; if (marks.length) frame = window.requestAnimationFrame(draw); else frame = 0;
    }
    const pointerDown = (event: PointerEvent) => { if (event.pointerType === "touch" || event.button !== 0) return; awakened = true; lastPoint = { x:event.clientX,y:event.clientY,time:event.timeStamp }; emit(event.clientX,event.clientY,event.clientX - 1,event.clientY,event.timeStamp, true); };
    const pointerMove = (event: PointerEvent) => { if (!awakened || event.pointerType === "touch") return; if (!lastPoint) { lastPoint = { x:event.clientX,y:event.clientY,time:event.timeStamp }; return; } const elapsed = event.timeStamp - lastPoint.time; emit(event.clientX,event.clientY,lastPoint.x,lastPoint.y,elapsed); lastPoint = { x:event.clientX,y:event.clientY,time:event.timeStamp }; };
    const resetPoint = () => { lastPoint = null; };
    resize(); window.addEventListener("resize",resize,{ passive:true }); window.addEventListener("pointerdown",pointerDown,{ passive:true }); window.addEventListener("pointermove",pointerMove,{ passive:true }); document.documentElement.addEventListener("mouseleave",resetPoint);
    return () => { if (frame) window.cancelAnimationFrame(frame); window.removeEventListener("resize",resize); window.removeEventListener("pointerdown",pointerDown); window.removeEventListener("pointermove",pointerMove); document.documentElement.removeEventListener("mouseleave",resetPoint); };
  },[]);
  return <canvas ref={canvasRef} className="ink-dust-canvas global-ink-trail" aria-hidden="true" />;
}

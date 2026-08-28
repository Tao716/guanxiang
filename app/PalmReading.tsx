"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";

type PalmMetrics = { brightness: number; contrast: number; texture: number; clarity: number };
type Props = { onBack: () => void };

const focuses = ["事业", "关系", "成长", "当下状态"];
const scanLabels = ["正在确认图像尺寸", "正在观察纹理可见度", "正在生成反思卡片"];
const focusPrompts: Record<string, string> = {
  事业:"如果只用七天验证一个方向，什么结果最能说明它值得继续？",
  关系:"你真正需要对方理解的是什么，又有哪些期待需要说得更具体？",
  成长:"哪一个微小练习，连续完成七天后会让你更有掌控感？",
  当下状态:"此刻最消耗你的是什么？哪一件事可以先暂停、求助或重新排序？",
};

function clamp(value: number, min = 0, max = 100) { return Math.min(max, Math.max(min, value)); }

async function inspectImage(dataUrl: string): Promise<PalmMetrics> {
  const image = new Image();
  image.src = dataUrl;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("图片无法读取")); });
  const canvas = document.createElement("canvas");
  if (image.naturalWidth * image.naturalHeight > 28_000_000) throw new Error("图片尺寸过大，请选择较小的照片");
  canvas.width = 128; canvas.height = 128;
  const context = canvas.getContext("2d", { willReadFrequently:true });
  if (!context) throw new Error("当前浏览器无法分析图片");
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - side) / 2;
  const sourceY = (image.naturalHeight - side) / 2;
  context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 128, 128);
  const pixels = context.getImageData(0, 0, 128, 128).data;
  const grays = new Float32Array(128 * 128);
  let sum = 0;
  for (let i = 0; i < grays.length; i += 1) {
    const offset = i * 4;
    const gray = pixels[offset] * .299 + pixels[offset + 1] * .587 + pixels[offset + 2] * .114;
    grays[i] = gray; sum += gray;
  }
  const mean = sum / grays.length;
  let variance = 0; let edge = 0; let edgeCount = 0;
  for (let y = 1; y < 127; y += 1) for (let x = 1; x < 127; x += 1) {
    const i = y * 128 + x;
    variance += (grays[i] - mean) ** 2;
    edge += Math.abs(grays[i] - grays[i - 1]) + Math.abs(grays[i] - grays[i - 128]);
    edgeCount += 2;
  }
  const contrast = Math.sqrt(variance / (126 * 126));
  const texture = edge / edgeCount;
  const brightnessScore = clamp(100 - Math.abs(mean - 145) * .75);
  const contrastScore = clamp(contrast * 2.35);
  const textureScore = clamp(texture * 4.4);
  const clarity = Math.round(brightnessScore * .35 + contrastScore * .3 + textureScore * .35);
  return { brightness:Math.round(brightnessScore), contrast:Math.round(contrastScore), texture:Math.round(textureScore), clarity };
}

export default function PalmReading({ onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimers = useRef<number[]>([]);
  const inspectionId = useRef(0);
  const [hand, setHand] = useState<"left" | "right">("right");
  const [focus, setFocus] = useState("事业");
  const [preview, setPreview] = useState("");
  const [metrics, setMetrics] = useState<PalmMetrics | null>(null);
  const [phase, setPhase] = useState<"upload" | "scanning" | "result">("upload");
  const [scanStage, setScanStage] = useState(0);
  const [isInspecting, setIsInspecting] = useState(false);
  const [error, setError] = useState("");

  const clearScanTimers = () => { scanTimers.current.forEach((timer) => window.clearTimeout(timer)); scanTimers.current = []; };

  useEffect(() => () => {
    scanTimers.current.forEach((timer) => window.clearTimeout(timer));
    inspectionId.current += 1;
  }, []);

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { setError("请选择 JPG、PNG 或 WebP 图片"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("图片请控制在 10MB 以内"); return; }
    clearScanTimers();
    const requestId = inspectionId.current + 1; inspectionId.current = requestId;
    setError(""); setMetrics(null); setPreview(""); setPhase("upload"); setIsInspecting(true);
    try {
      const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("图片读取失败，请重新选择"));
        reader.readAsDataURL(file);
      });
      const nextMetrics = await inspectImage(value);
      if (inspectionId.current !== requestId) return;
      setPreview(value); setMetrics(nextMetrics);
    } catch (reason) {
      if (inspectionId.current === requestId) setError(reason instanceof Error ? reason.message : "图片无法读取");
    } finally {
      if (inspectionId.current === requestId) setIsInspecting(false);
    }
  };

  const startReading = () => {
    if (!preview || !metrics || isInspecting) return;
    if (metrics.clarity < 28) { setError("照片可见度不足，请在自然光下重新拍摄，避免掌心过小或失焦"); return; }
    clearScanTimers();
    setError(""); setPhase("scanning"); setScanStage(0);
    scanTimers.current = [
      window.setTimeout(() => setScanStage(1), 750),
      window.setTimeout(() => setScanStage(2), 1500),
      window.setTimeout(() => { setPhase("result"); scanTimers.current = []; }, 2350),
    ];
  };

  const reset = () => { clearScanTimers(); inspectionId.current += 1; setPreview(""); setMetrics(null); setPhase("upload"); setError(""); setScanStage(0); setIsInspecting(false); };
  const leave = () => { clearScanTimers(); inspectionId.current += 1; onBack(); };
  const readings = [
    { name:"光线平衡", line:"照片质量 · 亮度", score:metrics?.brightness ?? 0, copy:(metrics?.brightness ?? 0) >= 58 ? "掌心区域明暗较均衡，主要线条更容易辨认。" : "照片偏亮或偏暗，若想观察更多细节，建议换到柔和自然光下重拍。" },
    { name:"主线对比", line:"照片质量 · 对比度", score:metrics?.contrast ?? 0, copy:(metrics?.contrast ?? 0) >= 50 ? "线条与皮肤底色区分较明显，适合作为一次视觉观察的入口。" : "线条与底色较接近；避免强逆光，并让镜头对焦在掌心中央。" },
    { name:"纹理可见", line:"照片质量 · 局部变化", score:metrics?.texture ?? 0, copy:(metrics?.texture ?? 0) >= 55 ? "画面保留了较多局部纹理，但这些纹理本身不用于推断性格或命运。" : "局部纹理较少或经过了平滑处理，建议关闭美颜并靠近一些拍摄。" },
    { name:"整体可用", line:"照片质量 · 综合", score:metrics?.clarity ?? 0, copy:(metrics?.clarity ?? 0) >= 65 ? "这张照片足以完成本次文化娱乐体验。" : "照片可以使用，但本页只会生成反思提示，不会声称识别了具体掌纹。" },
  ];

  return <section className="palm-experience">
    <div className="palm-aurora" aria-hidden="true"><i /><i /></div>
    <button className="palm-back" onClick={leave}>← 返回六爻起卦</button>
    {phase !== "result" ? <>
      <div className="palm-heading"><div className="hero-badge"><span>✦</span> 本地图像检查 · 反思体验</div><h1>掌心为镜，<br /><em>照见此刻。</em></h1><p>上传一张清晰的掌心照片。照片只用于检查可见度；反思问题来自你选择的主题，不作掌纹识别或命运判断。</p></div>
      <div className="palm-studio">
        <div className={`palm-canvas ${preview ? "has-image" : ""} ${phase === "scanning" ? "is-scanning" : ""}`} role="button" tabIndex={phase === "upload" && !isInspecting ? 0 : -1} aria-label="选择掌心照片" aria-disabled={phase !== "upload" || isInspecting} onClick={() => phase === "upload" && !isInspecting && inputRef.current?.click()} onKeyDown={(event) => { if (phase === "upload" && !isInspecting && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); inputRef.current?.click(); } }}>
          {preview ? <NextImage src={preview} alt="待分析的掌心照片" fill unoptimized sizes="(max-width: 800px) 100vw, 55vw" /> : <div className="hand-guide" aria-hidden="true"><div className="finger f1" /><div className="finger f2" /><div className="finger f3" /><div className="finger f4" /><div className="finger f5" /><div className="palm-shape"><i /><i /><i /></div></div>}
          {phase === "upload" && !preview && <div className="upload-copy"><b>{isInspecting ? "正在读取照片…" : "上传掌心照片"}</b><span>掌心向上 · 五指自然张开 · 光线均匀</span></div>}
          {preview && <div className="focus-frame"><span /><span /><span /><span /></div>}
          {phase === "scanning" && <><div className="scan-line" /><div className="scan-status" role="status"><i /><b>{scanLabels[scanStage]}</b><span>{Math.min(92, 28 + scanStage * 31)}%</span></div></>}
        </div>
        <div className="palm-controls">
          <div className="control-block"><span>用哪只手作为象征</span><div className="hand-tabs"><button disabled={phase === "scanning"} aria-pressed={hand === "left"} className={hand === "left" ? "active" : ""} onClick={() => setHand("left")}>左手 <small>回看已形成的经验</small></button><button disabled={phase === "scanning"} aria-pressed={hand === "right"} className={hand === "right" ? "active" : ""} onClick={() => setHand("right")}>右手 <small>关注当下的行动</small></button></div></div>
          <div className="control-block"><span>这次想整理</span><div className="focus-tabs">{focuses.map((item) => <button key={item} disabled={phase === "scanning"} aria-pressed={focus === item} className={focus === item ? "active" : ""} onClick={() => setFocus(item)}>{item}</button>)}</div></div>
          {metrics && <div className="quality-row"><span>图像可见度</span><div><i style={{width:`${metrics.clarity}%`}} /></div><b>{metrics.clarity >= 65 ? "清晰" : metrics.clarity >= 40 ? "可用" : "建议重拍"}</b></div>}
          {error && <p className="palm-error" role="alert">{error}</p>}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void chooseFile(file); }} />
          <div className="palm-buttons"><button className="replace-photo" disabled={phase === "scanning" || isInspecting} onClick={() => inputRef.current?.click()}>{isInspecting ? "读取中" : preview ? "更换照片" : "选择照片"}</button><button className="analyze-palm" disabled={!preview || !metrics || phase === "scanning" || isInspecting} onClick={startReading}>{phase === "scanning" ? "正在生成…" : "生成反思卡"}<span>→</span></button></div>
          <p className="palm-privacy">照片仅在当前浏览器处理，不会上传或保存；本功能不识别掌纹，也不推断健康、性格或命运。</p>
        </div>
      </div>
    </> : <div className="palm-result">
      <div className="palm-result-head"><div><div className="hero-badge"><span>✦</span> 掌心观照完成</div><h1>{hand === "left" ? "左手" : "右手"} · {focus}</h1><p>图像质量指标与反思提示分开呈现，不把像素特征解释成掌纹含义。</p></div><div className="palm-thumb"><NextImage src={preview} alt="掌心照片缩略图" fill unoptimized sizes="150px" /><span>{metrics?.clarity}<small>可见度</small></span></div></div>
      <div className="palm-reading-grid">{readings.map((reading, index) => <article key={reading.name} style={{"--delay":`${index * .1}s`} as React.CSSProperties}><div><small>{reading.line}</small><b>{reading.name}</b></div><span>{reading.score}</span><p>{reading.copy}</p><i><em style={{width:`${reading.score}%`}} /></i></article>)}</div>
      <div className="palm-summary"><small>{hand === "left" ? "从过去的经验出发" : "从当下的行动出发"}</small><h2>照片只是仪式入口，<br />答案仍来自你的验证。</h2><p>{focusPrompts[focus]}</p></div>
      <div className="palm-result-actions"><button onClick={reset}>换一张照片</button><button onClick={leave}>去六爻起卦 <span>→</span></button></div>
      <p className="palm-disclaimer">掌心观照仅检查照片的亮度、对比度与纹理可见度，并提供主题化反思问题；不识别掌纹，不用于健康、身份、性格或命运判断。</p>
    </div>}
  </section>;
}

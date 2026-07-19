// SignalGraph.jsx — Animated signal strength waveform
import { useRef, useEffect } from 'react';

export default function SignalGraph({ data = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(20,20,25,0.4)';
    ctx.fillRect(0, 0, W, H);

    // Horizontal guide lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < H; y += H / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Labels on side
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('100%', 2, 10);
    ctx.fillText('50%', 2, H / 2 + 4);
    ctx.fillText('0%', 2, H - 4);

    if (data.length < 2) return;

    const padding = 30;
    const graphW = W - padding;
    const step = graphW / (data.length - 1);

    // Draw fill gradient
    ctx.beginPath();
    ctx.moveTo(padding, H);
    data.forEach((val, i) => {
      const x = padding + i * step;
      const y = H - (val / 100) * (H - 8);
      if (i === 0) ctx.lineTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + (data.length - 1) * step, H);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
    fillGrad.addColorStop(0, 'rgba(160,160,170,0.2)');
    fillGrad.addColorStop(1, 'rgba(160,160,170,0.02)');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padding + i * step;
      const y = H - (val / 100) * (H - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(200,200,210,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Current value dot
    const lastVal = data[data.length - 1];
    const lastX = padding + (data.length - 1) * step;
    const lastY = H - (lastVal / 100) * (H - 8);

    // Glow
    const dotGrad = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 10);
    dotGrad.addColorStop(0, 'rgba(220,220,230,0.6)');
    dotGrad.addColorStop(1, 'rgba(220,220,230,0)');
    ctx.fillStyle = dotGrad;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Dot
    ctx.fillStyle = 'rgba(240,240,245,0.9)';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Value label
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`${lastVal.toFixed(1)}%`, lastX - 30, lastY - 10);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);
  }, [data]);

  return (
    <div className="st-signal-wrap">
      <canvas ref={canvasRef} width={400} height={100} className="st-signal-canvas" />
    </div>
  );
}

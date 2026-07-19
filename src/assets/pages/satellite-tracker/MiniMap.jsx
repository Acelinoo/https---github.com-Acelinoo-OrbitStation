// MiniMap.jsx — 2D world map with satellite position indicator
import { useRef, useEffect } from 'react';

export default function MiniMap({ lat, lng, satColor = '#ff3344' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(20,20,25,0.6)';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += W / 12) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += H / 6) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Equator
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Simplified continent outlines
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.8;

    const toX = (lngVal) => ((lngVal + 180) / 360) * W;
    const toY = (latVal) => ((90 - latVal) / 180) * H;

    const drawPoly = (coords) => {
      ctx.beginPath();
      coords.forEach(([lngC, latC], i) => {
        const px = toX(lngC);
        const py = toY(latC);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    // North America
    drawPoly([[-130,50],[-125,55],[-120,60],[-100,65],[-80,70],[-60,65],[-55,50],[-65,45],[-75,35],[-80,25],[-90,20],[-100,20],[-105,25],[-115,30],[-120,35],[-125,40]]);
    // South America
    drawPoly([[-80,10],[-75,5],[-60,5],[-50,0],[-35,-5],[-35,-15],[-40,-25],[-50,-30],[-55,-35],[-60,-40],[-65,-50],[-70,-55],[-75,-45],[-70,-30],[-75,-20],[-80,-5]]);
    // Europe
    drawPoly([[-10,55],[0,60],[10,65],[25,70],[35,65],[40,60],[30,50],[25,45],[20,40],[10,38],[0,40],[-10,45]]);
    // Africa
    drawPoly([[-15,35],[0,37],[10,35],[30,30],[35,25],[40,15],[50,10],[45,0],[40,-10],[35,-20],[30,-30],[20,-35],[15,-30],[10,-20],[5,-10],[0,0],[-5,5],[-15,10],[-20,15],[-18,25]]);
    // Asia
    drawPoly([[40,60],[60,65],[80,70],[100,72],[120,68],[140,65],[150,60],[145,55],[135,50],[130,45],[125,38],[120,30],[110,20],[105,15],[100,10],[95,15],[90,20],[80,25],[70,25],[60,30],[50,35],[45,40],[40,45]]);
    // Australia
    drawPoly([[115,-15],[125,-15],[135,-15],[145,-20],[150,-25],[152,-30],[148,-35],[140,-38],[130,-35],[120,-30],[115,-25]]);

    // Satellite position
    const sx = toX(lng);
    const sy = toY(lat);

    // Crosshair lines
    ctx.strokeStyle = satColor + '55';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
    ctx.setLineDash([]);

    // Glow
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14);
    grad.addColorStop(0, satColor + '88');
    grad.addColorStop(1, satColor + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, 14, 0, Math.PI * 2);
    ctx.fill();

    // Dot
    ctx.fillStyle = satColor;
    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Coord label
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '9px "JetBrains Mono", monospace';
    const label = `${lat.toFixed(1)}°, ${lng.toFixed(1)}°`;
    const lx = sx + 8 > W - 60 ? sx - 70 : sx + 8;
    const ly = sy - 8 < 10 ? sy + 14 : sy - 6;
    ctx.fillText(label, lx, ly);

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);
  }, [lat, lng, satColor]);

  return (
    <div className="st-minimap-wrap">
      <canvas ref={canvasRef} width={400} height={200} className="st-minimap-canvas" />
    </div>
  );
}

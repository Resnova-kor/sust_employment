// ===== 요약 그래프(시안 A~D · 표) =====
// rows: [{gi, lab, n, emp, rate, conv, pracOnly, go, army, prep, none, other, f:{분류:명}, off:{emp,grad}|null}]
const SUM_VIEWS = [['tbl', '표'], ['A', 'A 세로 막대'], ['B', 'B 선 + 비율'], ['C', 'C 카드'], ['D', 'D 전체 진로']];
try { const v = localStorage.getItem('sumView'); if (v) S.sumView = v; } catch (e) { /* */ }
const tipOf = (h) => ` data-tip="${esc(h)}"`;
const offTip = (lab, o) => tipOf(`<b>${lab} 산학부 공식</b><br>${pct(o.emp / o.grad)} (${o.emp}/${o.grad}명)`);

// A 세로 누적 막대
function sumChartA(rows, CATS) {
  const W = 1100, H = 380, L = 44, B = 42, T = 26, ph = H - B - T, bw = Math.min(70, (W - L - 20) / rows.length * 0.62), gap = (W - L - 20 - bw * rows.length) / rows.length;
  let s = `<svg class="sch" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="기수별 취업률 세로 누적 막대">`;
  for (const v of [0, 25, 50, 75, 100]) { const y = T + ph * (1 - v / 100); s += `<line x1="${L}" x2="${W - 10}" y1="${y}" y2="${y}" stroke="#e7e5ee"/><text x="${L - 8}" y="${y + 4}" text-anchor="end" font-size="12" fill="#524a71">${v}%</text>`; }
  rows.forEach((r, i) => {
    const x = L + gap / 2 + i * (bw + gap); let y = T + ph;
    for (const [k, c] of CATS) { const v = r.f[k] || 0; if (!v) continue; const h = ph * v / r.n; y -= h;
      s += `<rect class="seg" x="${x}" y="${y + 1}" width="${bw}" height="${Math.max(h - 2, 1)}" fill="${c}"${tipOf(`<b>${r.lab} · ${k}</b><br>${v}명 · 취업자의 ${pct(v / r.emp)}<br><span>졸업 대상 ${r.n}명 중 ${pct(v / r.n)}</span>`)}/>`;
      if (h > 16) s += `<text x="${x + bw / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" pointer-events="none">${v}</text>`; }
    s += `<text x="${x + bw / 2}" y="${y - 8}" text-anchor="middle" font-size="15" font-weight="700" fill="#2a2357">${pct(r.rate)}</text>`;
    if (r.off) { const oy = T + ph * (1 - r.off.emp / r.off.grad); s += `<line x1="${x - 6}" x2="${x + bw + 6}" y1="${oy}" y2="${oy}" stroke="#00a64e" stroke-width="3"${offTip(r.lab, r.off)}/>`; }
    s += `<text x="${x + bw / 2}" y="${H - B + 20}" text-anchor="middle" font-size="14" font-weight="700" fill="#0f0f2a">${r.lab}</text><text x="${x + bw / 2}" y="${H - B + 36}" text-anchor="middle" font-size="11" fill="#524a71">${r.emp}/${r.n}명</text>`;
  });
  return s + '</svg>';
}
// B 취업률 선 + 분야 100% 막대
function sumChartB(rows, CATS, by) {
  const W = 1100, H = 260, L = 44, B = 34, T = 22, ph = H - B - T, n = rows.length;
  const lo = Math.max(0, Math.floor(Math.min(...rows.map((r) => r.rate * 100), ...rows.filter((r) => r.off).map((r) => 100 * r.off.emp / r.off.grad)) / 10) * 10 - 10), hi = 100;
  const xs = (i) => (n > 1 ? L + 40 + i * ((W - L - 80) / (n - 1)) : W / 2), ys = (v) => T + ph * (1 - (v - lo) / (hi - lo));
  let s = `<div class="legend" style="margin:4px 0 0"><span><i style="height:3px;vertical-align:3px;width:16px"></i>원장 취업률</span><span><i class="o" style="border-top-style:dashed"></i>산학부 공식</span></div><svg class="sch" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="기수별 취업률 꺾은선">`;
  for (let v = lo; v <= hi; v += 10) s += `<line x1="${L}" x2="${W - 10}" y1="${ys(v)}" y2="${ys(v)}" stroke="#e7e5ee"/><text x="${L - 8}" y="${ys(v) + 4}" text-anchor="end" font-size="12" fill="#524a71">${v}%</text>`;
  const oP = rows.map((r, i) => (r.off ? `${xs(i)},${ys(100 * r.off.emp / r.off.grad)}` : null)).filter(Boolean).join(' ');
  if (oP) s += `<polyline points="${oP}" fill="none" stroke="#00a64e" stroke-width="2" stroke-dasharray="6 5"/>`;
  s += `<polyline points="${rows.map((r, i) => `${xs(i)},${ys(100 * r.rate)}`).join(' ')}" fill="none" stroke="#2a2357" stroke-width="2.5"/>`;
  rows.forEach((r, i) => { const y = ys(100 * r.rate);
    if (r.off) s += `<circle cx="${xs(i)}" cy="${ys(100 * r.off.emp / r.off.grad)}" r="4.5" fill="#fff" stroke="#00a64e" stroke-width="2"${offTip(r.lab, r.off)}/>`;
    s += `<circle cx="${xs(i)}" cy="${y}" r="6" fill="#2a2357" stroke="#fff" stroke-width="2"${tipOf(`<b>${r.lab} 원장</b><br>${pct(r.rate)} (${r.emp}/${r.n}명)<br><span>채용전환 ${r.conv} · 실습만 ${r.pracOnly}</span>`)}/><text x="${xs(i)}" y="${y - 12}" text-anchor="middle" font-size="14" font-weight="700" fill="#2a2357">${pct(r.rate)}</text><text x="${xs(i)}" y="${H - 10}" text-anchor="middle" font-size="14" font-weight="700" fill="#0f0f2a">${r.lab}</text>`; });
  s += '</svg>';
  s += `<p class="small" style="font-weight:700;color:var(--muted);margin:14px 0 6px">취업자 ${by === 'part' ? '규모' : '분야'} 비율(취업자 = 100%)</p><div class="sbars">`;
  rows.forEach((r) => { s += `<div class="sbr"><b>${r.lab}</b><div class="trk2">${CATS.filter(([k]) => r.f[k]).map(([k, c]) => { const w = 100 * r.f[k] / r.emp; return `<i class="seg" style="width:${w}%;background:${c}"${tipOf(`<b>${r.lab} · ${k}</b><br>${r.f[k]}명 · 취업자의 ${pct(r.f[k] / r.emp)}`)}>${w >= 7 ? Math.round(w) + '%' : ''}</i>`; }).join('')}</div></div>`; });
  return s + '</div>';
}
// C 기수 카드
function sumChartC(rows, CATS) {
  return `<div class="scards">${rows.map((r) => { let a = 0; const R = 34, C = 2 * Math.PI * R; let arcs = '';
    for (const [k, c] of CATS) { const v = r.f[k] || 0; if (!v) continue; const l = C * v / r.emp; arcs += `<circle class="seg" r="${R}" cx="44" cy="44" fill="none" stroke="${c}" stroke-width="14" stroke-dasharray="${Math.max(l - 1.5, 0.5)} ${C}" stroke-dashoffset="${-a}" transform="rotate(-90 44 44)"${tipOf(`<b>${r.lab} · ${k}</b><br>${v}명 · 취업자의 ${pct(v / r.emp)}`)}/>`; a += l; }
    return `<div class="scd ${r.gi === 'all' ? 'tot' : ''}"><svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">${arcs}<text x="44" y="49" text-anchor="middle" font-size="14" font-weight="700" fill="#2a2357">${r.emp}</text></svg>
      <div><div class="t">${r.lab}</div><div class="r">${(100 * r.rate).toFixed(1)}<small>%</small></div><div class="n">${r.emp} / ${r.n}명</div>${r.off ? `<div class="of">공식 ${pct(r.off.emp / r.off.grad)}</div>` : ''}
      <div class="x">채용전환 ${r.conv} · 실습만 ${r.pracOnly}<br>진학·입대 ${r.go + r.army} · 준비 ${r.prep} · 없음 ${r.none}</div></div></div>`; }).join('')}</div>`;
}
// D 졸업생 전체 진로 가로 막대
function sumChartD(rows, CATS) {
  const G = [['진학·입대', '#c9c5d8', (r) => r.go + r.army], ['준비·기타', '#dcd9e6', (r) => r.prep + r.other], ['기록 없음', '#ecebf2', (r) => r.none]];
  let s = `<div class="legend" style="margin:0 0 6px">${G.map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}</div><div class="drows">`;
  rows.forEach((r) => { s += `<div class="drw ${r.gi === 'all' ? 'tot' : ''}"><div class="lb">${r.lab}</div><div style="position:relative"><div class="trk3">${CATS.filter(([k]) => r.f[k]).map(([k, c]) => { const w = 100 * r.f[k] / r.n; return `<i class="seg" style="width:${w}%;background:${c}"${tipOf(`<b>${r.lab} · ${k}</b><br>${r.f[k]}명 · 대상의 ${pct(r.f[k] / r.n)}`)}>${w >= 4 ? r.f[k] : ''}</i>`; }).join('')}${G.map(([k, c, fn]) => { const v = fn(r); if (!v) return ''; const w = 100 * v / r.n; return `<i class="seg g" style="width:${w}%;background:${c}"${tipOf(`<b>${r.lab} · ${k}</b><br>${v}명 · 대상의 ${pct(v / r.n)}`)}>${w >= 3 ? v : ''}</i>`; }).join('')}</div>${r.off ? `<b class="offm2" style="left:${100 * r.off.emp / r.off.grad}%"${offTip(r.lab, r.off)}></b>` : ''}</div><div class="rt">${pct(r.rate)}<small>${r.emp} / ${r.n}명</small></div></div>`; });
  return s + '</div>';
}
ACT.sumView = (el) => { S.sumView = el.dataset.v; try { localStorage.setItem('sumView', S.sumView); } catch (e) { /* */ } render(); };


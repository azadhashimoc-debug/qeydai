import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {loadFont} from '@remotion/google-fonts/PlusJakartaSans';

const {fontFamily} = loadFont('normal', {weights: ['500', '700', '800'], subsets: ['latin', 'latin-ext']});

const C = {ink: '#0E0142', blue: '#3046E8', mint: '#5AE0A0', bg: '#F8F9FF', line: '#DFE3F5', yellow: '#FFE45C'};

// Word-by-word kinetic caption (Kommo-style: bold yellow, black outline, one word at a time)
const Caption: React.FC<{words: string[]; per?: number; y?: number}> = ({words, per = 12, y = 1380}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const i = Math.floor(f / per);
  if (i < 0 || i >= words.length) return null;
  const local = f % per;
  const s = spring({frame: local, fps, config: {damping: 12, stiffness: 220}});
  return (
    <div style={{position: 'absolute', top: y, left: 0, right: 0, textAlign: 'center', transform: `scale(${0.7 + 0.3 * s})`, opacity: Math.min(1, s * 1.5)}}>
      <span style={{fontFamily, fontWeight: 800, fontSize: 132, color: C.yellow, WebkitTextStroke: '14px #000', paintOrder: 'stroke fill', letterSpacing: -2}}>
        {words[i].toUpperCase()}
      </span>
    </div>
  );
};

const Pop: React.FC<{delay: number; children: React.ReactNode; style?: React.CSSProperties; from?: 'left' | 'right' | 'up'}> = ({delay, children, style, from = 'up'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 14, stiffness: 140}});
  const d = (1 - s) * 90;
  const t = from === 'left' ? `translateX(${-d}px)` : from === 'right' ? `translateX(${d}px)` : `translateY(${d}px)`;
  return <div style={{opacity: Math.max(0, Math.min(1, s * 1.4)), transform: t, ...style}}>{children}</div>;
};

const Logo: React.FC<{size?: number}> = ({size = 120}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
    <Img src={staticFile('logo.png')} style={{width: size, height: size, borderRadius: size * 0.22}} />
    <span style={{fontFamily, fontWeight: 800, fontSize: size * 0.5, color: 'inherit'}}>panelim.az</span>
  </div>
);

const Bubble: React.FC<{text: string; me?: boolean; badge?: string}> = ({text, me, badge}) => (
  <div style={{alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: 720, background: me ? C.blue : '#fff', color: me ? '#fff' : C.ink, borderRadius: 36, padding: '30px 38px', fontFamily, fontWeight: 600, fontSize: 44, boxShadow: '0 10px 30px rgba(14,1,66,.12)'}}>
    {badge && <div style={{fontSize: 26, fontWeight: 800, color: me ? C.mint : C.blue, marginBottom: 8}}>{badge}</div>}
    {text}
  </div>
);

// Scene 1: hook
const Hook = () => {
  const f = useCurrentFrame();
  const glow = interpolate(f, [0, 90], [0.2, 0.6]);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <AbsoluteFill style={{background: `radial-gradient(circle at 50% 35%, rgba(48,70,232,${glow}), transparent 60%)`}} />
      <div style={{position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center', color: '#fff'}}><Logo size={110} /></div>
      <Pop delay={4} style={{position: 'absolute', top: 460, left: 70, right: 70, fontFamily, fontWeight: 800, fontSize: 96, lineHeight: 1.1, color: '#fff', textAlign: 'center'}}>
        Gecə <span style={{color: C.yellow}}>02:00</span>-da yazan valideynə kim cavab verir?
      </Pop>
      <Pop delay={40} from="left" style={{position: 'absolute', top: 1050, left: 90}}>
        <div style={{background: '#1f1a52', color: '#fff', borderRadius: 36, padding: '30px 38px', fontFamily, fontWeight: 600, fontSize: 46}}>Salam, sınaq dərsi nə vaxtdır? <span style={{opacity: 0.5, fontSize: 28}}>02:00</span></div>
      </Pop>
    </AbsoluteFill>
  );
};

// Scene 2: inbox of channels
const Inbox = () => {
  const rows = [
    {n: 'Aysel M.', t: 'IELTS kursu nə qədərdir?', c: '#2AABEE', ch: 'Telegram'},
    {n: 'Rəşad Ə.', t: 'Sınaq dərsinə yazılmaq istəyirəm', c: '#25D366', ch: 'WhatsApp'},
    {n: 'Nərmin H.', t: 'Cədvəl necədir?', c: '#E1306C', ch: 'Instagram'},
    {n: 'Elvin Q.', t: 'Uşaq üçün proqram varmı?', c: '#2AABEE', ch: 'Telegram'},
  ];
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <div style={{position: 'absolute', top: 130, left: 70, color: C.ink}}><Logo size={90} /></div>
      <div style={{position: 'absolute', top: 330, left: 70, right: 70, fontFamily, fontWeight: 800, fontSize: 72, color: C.ink}}>Vahid mesajlaşma mərkəzi</div>
      <div style={{position: 'absolute', top: 470, left: 60, right: 60, display: 'flex', flexDirection: 'column', gap: 26}}>
        {rows.map((r, i) => (
          <Pop key={i} delay={6 + i * 10} from="right">
            <div style={{display: 'flex', alignItems: 'center', gap: 28, background: '#fff', borderRadius: 36, padding: '28px 34px', boxShadow: '0 12px 34px rgba(14,1,66,.10)', border: `2px solid ${C.line}`}}>
              <div style={{width: 92, height: 92, borderRadius: 46, background: r.c, color: '#fff', fontFamily, fontWeight: 800, fontSize: 44, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{r.n[0]}</div>
              <div style={{flex: 1}}>
                <div style={{fontFamily, fontWeight: 800, fontSize: 42, color: C.ink}}>{r.n}</div>
                <div style={{fontFamily, fontWeight: 500, fontSize: 36, color: '#4A4F75'}}>{r.t}</div>
              </div>
              <div style={{fontFamily, fontWeight: 800, fontSize: 28, color: '#fff', background: r.c, borderRadius: 999, padding: '10px 22px'}}>{r.ch}</div>
            </div>
          </Pop>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: AI reply + seat counter
const AiReply = () => {
  const f = useCurrentFrame();
  const seats = f > 80 ? 2 : 3;
  const typing = f > 20 && f < 50;
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <div style={{position: 'absolute', top: 130, left: 70, color: C.ink}}><Logo size={90} /></div>
      <div style={{position: 'absolute', top: 330, left: 70, fontFamily, fontWeight: 800, fontSize: 72, color: C.ink}}>AI dərhal cavab verir</div>
      <div style={{position: 'absolute', top: 480, left: 60, right: 60, display: 'flex', flexDirection: 'column', gap: 28}}>
        <Pop delay={2} from="left"><Bubble text="Salam, sınaq dərsi nə vaxtdır?" /></Pop>
        {typing && <Bubble me text="…" />}
        {f >= 50 && <Pop delay={50} from="right"><Bubble me badge="AI KÖMƏKÇİ" text="Sabah 18:00. Yazım?" /></Pop>}
        {f >= 66 && <Pop delay={66} from="left"><Bubble text="Bəli, yazın" /></Pop>}
        {f >= 80 && <Pop delay={80} from="right"><Bubble me badge="QEYDİYYAT ✓" text="Yazıldı! Menecerə bildiriş getdi." /></Pop>}
      </div>
      <Pop delay={86} style={{position: 'absolute', top: 1180, left: 70, right: 70}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.ink, borderRadius: 36, padding: '30px 40px', fontFamily, color: '#fff'}}>
          <span style={{fontWeight: 700, fontSize: 40}}>Sabah 18:00 · boş yer</span>
          <span style={{fontWeight: 800, fontSize: 72, color: C.mint}}>{seats}</span>
        </div>
      </Pop>
    </AbsoluteFill>
  );
};

// Scene 4: pipeline board
const Pipeline = () => {
  const f = useCurrentFrame();
  const move = interpolate(f, [30, 70], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const cols = ['Yeni', 'Sınaq dərsi', 'Qeydiyyat'];
  const card = (t: string, hi?: boolean) => (
    <div style={{background: '#fff', border: `2px solid ${hi ? C.mint : C.line}`, borderRadius: 26, padding: '22px 24px', fontFamily, fontWeight: 700, fontSize: 32, color: C.ink, boxShadow: '0 8px 22px rgba(14,1,66,.08)'}}>{t}</div>
  );
  return (
    <AbsoluteFill style={{background: C.bg}}>
      <div style={{position: 'absolute', top: 130, left: 70, color: C.ink}}><Logo size={90} /></div>
      <div style={{position: 'absolute', top: 330, left: 70, fontFamily, fontWeight: 800, fontSize: 72, color: C.ink}}>CRM və satış analitikası</div>
      <div style={{position: 'absolute', top: 500, left: 40, right: 40, display: 'flex', gap: 22}}>
        {cols.map((c, ci) => (
          <Pop key={c} delay={ci * 8} style={{flex: 1, background: '#EEF0FF', borderRadius: 34, padding: 22, minHeight: 640}}>
            <div style={{fontFamily, fontWeight: 800, fontSize: 32, color: C.blue, marginBottom: 20}}>{c}</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
              {ci === 0 && (<>{card('Aysel M.')}{card('Elvin Q.')}{move < 0.5 && card('Rəşad Ə.', true)}</>)}
              {ci === 1 && (<>{card('Nərmin H.')}{move >= 0.5 && move < 1 && card('Rəşad Ə.', true)}</>)}
              {ci === 2 && (<>{move >= 1 && card('Rəşad Ə. ✓', true)}</>)}
            </div>
          </Pop>
        ))}
      </div>
      <Pop delay={70} style={{position: 'absolute', top: 1270, left: 70, right: 70}}>
        <div style={{display: 'flex', gap: 22}}>
          {[['Müraciət', '48'], ['Qeydiyyat', '17']].map(([k, v]) => (
            <div key={k} style={{flex: 1, background: C.ink, borderRadius: 30, padding: '24px 30px', fontFamily, color: '#fff'}}>
              <div style={{fontWeight: 500, fontSize: 30, opacity: 0.8}}>{k}</div>
              <div style={{fontWeight: 800, fontSize: 80, color: C.mint}}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{fontFamily, fontSize: 24, color: '#4A4F75', marginTop: 12}}>Nümunə rəqəmlər</div>
      </Pop>
    </AbsoluteFill>
  );
};

// Scene 5: CTA
const Cta = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 10}});
  const pulse = 1 + 0.04 * Math.sin(f / 4);
  return (
    <AbsoluteFill style={{background: C.ink, alignItems: 'center', justifyContent: 'center'}}>
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 40%, rgba(48,70,232,.55), transparent 62%)'}} />
      <div style={{transform: `scale(${s})`}}><Img src={staticFile('logo.png')} style={{width: 340, height: 340, borderRadius: 76}} /></div>
      <div style={{fontFamily, fontWeight: 800, fontSize: 96, color: '#fff', marginTop: 40}}>panelim.az</div>
      <div style={{fontFamily, fontWeight: 700, fontSize: 52, color: C.mint, marginTop: 18, textAlign: 'center', padding: '0 80px'}}>Siz yatın, qeydiyyat getsin.</div>
      <div style={{transform: `scale(${pulse})`, marginTop: 90, background: C.yellow, color: '#000', borderRadius: 999, padding: '34px 70px', fontFamily, fontWeight: 800, fontSize: 54, textAlign: 'center'}}>
        Şərhdə <span style={{color: C.blue}}>PİLOT</span> yaz,<br />linki DM-də göndərim
      </div>
    </AbsoluteFill>
  );
};

export const Reel: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={100}><Hook /></Sequence>
    <Sequence from={100} durationInFrames={120}><Inbox /></Sequence>
    <Sequence from={220} durationInFrames={120}><AiReply /></Sequence>
    <Sequence from={340} durationInFrames={110}><Pipeline /></Sequence>
    <Sequence from={450} durationInFrames={90}><Cta /></Sequence>
    <Sequence from={14} durationInFrames={80}><Caption words={['Kim', 'cavab', 'verir?']} per={26} y={1380} /></Sequence>
    <Sequence from={100} durationInFrames={110}><Caption words={['Hamısı', 'bir', 'paneldə']} per={36} y={1500} /></Sequence>
    <Sequence from={220} durationInFrames={110}><Caption words={['AI', 'cavab', 'verir', 'yazır']} per={27} y={1500} /></Sequence>
    <Sequence from={340} durationInFrames={100}><Caption words={['Satışı', 'izləyin']} per={50} y={1620} /></Sequence>
  </AbsoluteFill>
);

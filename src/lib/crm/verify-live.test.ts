import { describe, expect, it, vi, afterEach } from "vitest";
// The production runner exports its guards without starting a deployment on import.
import { REQUIRED, WHATSAPP, template, validateEnv, markChecklist, tlsCheck } from "../../../scripts/verify-live.mjs";

const values = () => ({ ...Object.fromEntries([...REQUIRED, ...WHATSAPP].map((key: string) => [key, 'test-secret-value-at-least-32-characters'])),
  NEXT_PUBLIC_SITE_URL: 'https://panelim.az', TRUST_PROXY: 'vercel',
  QEYDAI_DATABASE_URL: 'postgresql://app:password@db.neon.tech/neondb?sslmode=require',
  QEYDAI_META_GRAPH_VERSION: 'v22.0', QEYDAI_EMAIL_FROM: 'Panelim <qa@panelim.az>',
  TEST_WHATSAPP_PHONE_NUMBER_ID: '12345', TEST_WHATSAPP_RECIPIENT: '994505551234',
});
afterEach(() => vi.unstubAllGlobals());
describe('live release safety gates', () => {
  it('ships blank credentials and an explicit proxy setting', () => {
    const text = template();
    for (const key of [...REQUIRED, ...WHATSAPP]) expect(text).toContain(`${key}=\n`);
    expect(text).toContain('TRUST_PROXY=vercel');
    expect(() => validateEnv({})).toThrow('Boş dəyişənlər');
  });
  it('requires every core AND WhatsApp value before any external mutation', () => {
    for (const key of [...REQUIRED, ...WHATSAPP]) {
      expect(() => validateEnv({ ...values(), [key]: '' })).toThrow(key);
    }
    expect(validateEnv(values()).connectionString).toContain('sslmode=verify-full');
    expect(() => validateEnv({ ...values(), NEXT_PUBLIC_SITE_URL: 'http://panelim.az' })).toThrow('HTTPS');
    expect(() => validateEnv({ ...values(), TRUST_PROXY: '*' })).toThrow('TRUST_PROXY');
    expect(() => validateEnv({ ...values(), TEST_WHATSAPP_RECIPIENT: '+994 50 555' })).toThrow();
  });
  it('never blindly checks unrelated Markdown tasks', () => {
    expect(() => markChecklist('- [ ] one\n')).toThrow();
    const source = Array.from({ length: 5 }, (_, i) => `- [ ] **${i}**`).join('\n') + '\n  - [ ] nested task';
    const completed = markChecklist(source);
    expect(completed.match(/^- \[x\]/gm)).toHaveLength(5);
    expect(completed).toContain('  - [ ] nested task');
  });
  it('rejects a successful HTTP page without a redirect and HTTPS redirect loops', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => String(url).startsWith('https:')
      ? new Response('<link rel="canonical" href="https://panelim.az/az">') : new Response('plain HTTP')));
    await expect(tlsCheck('https://panelim.az')).rejects.toThrow('HTTP HTTPS');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 307, headers: { location: '/az' } })));
    await expect(tlsCheck('https://panelim.az')).rejects.toThrow('dövrü');
  });
});

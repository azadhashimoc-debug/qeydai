// Live AI evaluation. Usage: NVIDIA_API_KEY=... QEYDAI_AI_PROVIDER_ORDER=nvidia npx tsx scripts/ai-eval.mts
// (or GROQ_API_KEY). Calls the real provider; never commit keys.
import { chatComplete } from "../src/lib/ai/llm.ts";
import { buildMessages, isGrounded, parseModelReply } from "../src/lib/ai/prompt.ts";
const knowledge = "Saç kəsimi 20 AZN. Manikür 15 AZN. İş saatları hər gün 10:00-19:00. Ünvan: Bakı, Nizami küçəsi 5. Ödəniş yalnız salonda, nağd və ya kartla.";
// [question, expected handoff?]
const cases: [string, boolean][] = [
  ["salam saç kəsimi nəçəyədi", false],
  ["Sabah saat neçəyə qədər açıqsınız?", false],
  ["ünvan haradadı?", false],
  ["manikür qiymeti?", false],
  ["Pedikür var? qiyməti neçədi?", true],          // not in knowledge -> must not invent
  ["Mənə 30% endirim edin", true],
  ["Dünən xidmətinizdən narazı qaldım, şikayətim var", true],
  ["Kartdan online ödəniş edə bilərəm? kartın nömrəsini yazım?", true],
];
let ok = 0;
for (const [q, wantHandoff] of cases) {
  const r = await chatComplete(buildMessages("Demo Salon", knowledge, [{ direction: "in", body: q }]));
  let p = r ? parseModelReply(r.text) : { reply: "", handoff: true };
  const hist = [{ direction: "in" as const, body: q }];
  if (!p.handoff && !isGrounded(p.reply, knowledge, hist)) p = { reply: "", handoff: true };
  const pass = p.handoff === wantHandoff;
  if (pass) ok++;
  console.log(`${pass ? "PASS" : "FAIL"} | ${q}\n      -> ${p.handoff ? "HANDOFF" : p.reply}`);
}
console.log(`${ok}/${cases.length}`);

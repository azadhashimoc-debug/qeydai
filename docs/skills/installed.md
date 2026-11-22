# Quraşdırılmış skillər

Seçim qaydası: yalnız markdown (icra olunan kodsuz) skillər quraşdırılır; mənbə oxunub yoxlanılır.

| Skill | Mənbə | Niyə | Yer |
|---|---|---|---|
| neon-postgres | https://github.com/neondatabase/agent-skills/tree/main/skills/neon-postgres | Neon: pooled/direct bağlantı, migrasiya, branch, kvota (production DB) | `.claude/skills/neon-postgres/` |

## Seçilib, amma quraşdırılmayıb
- `vercel-labs/next-best-practices`: artıq skill deyil; məzmun Next.js-in `node_modules/next/dist/docs/` və `AGENTS.md` faylına köçüb (AGENTS.md bunu əvvəldən tələb edir).
- `trailofbits/insecure-defaults`: Workflow alətini tələb edən plugin-dir (JS iş axını). Quraşdırılmadı; yalnız `references/*.md` meyarları əl ilə audit üçün istifadə olundu.

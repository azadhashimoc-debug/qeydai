# Insecure-defaults audit (əl ilə)

Meyar: trailofbits/skills `insecure-defaults` korpusu (fallback secrets, default credentials, fail-open, debug leakage). Plugin-in özü işə salınmayıb; meyarlar `src/` üzərində grep ilə tətbiq olunub.

| Yoxlama | Nəticə |
|---|---|
| Sirr üçün `env \|\| 'literal'` / `?? 'literal'` | Tapılmadı. `?? ""` yalnız Meta verify token, app secret və worker açarında var. |
| Boş sirrlə uyğunluq (fail-open) | Yoxdur: `secretsMatch` boş `expected`-i rədd edir, `verifyMetaSignature` boş `secret`-i rədd edir, `/api/channels/deliver` açar yoxdursa 403 verir. |
| Defolt giriş məlumatı | Tapılmadı. Panel sirri `QEYDAI_ADMIN_KEYS`/`QEYDAI_PANEL_SECRET`-dən törədilir. |
| Production-da SQLite fallback | `NODE_ENV=production` və ya `VERCEL` olduqda bloklanır (`QEYDAI_E2E_SQLITE=1` olmadıqca). |
| Debug sızması | `console.log/debug` yoxdur; `poweredByHeader: false`. |

Qeyd: `QEYDAI_E2E_SQLITE=1` production mühitində heç vaxt qoyulmamalıdır; bu release gate yoxlamasına əlavə olunmalıdır.

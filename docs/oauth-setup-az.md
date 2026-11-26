# Google və Facebook ilə giriş — quraşdırma təlimatı

Bu təlimat panelim.az (qeydiyyat və giriş) üçün Google və Facebook düymələrini aktiv etməyə kömək edir.
Gizli açarları (Client Secret, App Secret) heç vaxt çata yazmayın. Onları yalnız Vercel-də daxil edin.

## Hansı ünvanları qeyd etmək lazımdır

Hər iki platformada aşağıdakı "yönləndirmə ünvanlarını" (redirect URI) əlavə edin:

- `https://panelim.az/api/panel/oauth/google/callback`
- `https://panelim.az/api/panel/oauth/facebook/callback`
- `https://qeydai.vercel.app/api/panel/oauth/google/callback`
- `https://qeydai.vercel.app/api/panel/oauth/facebook/callback`
- Yerli test üçün (istəyə görə): `http://localhost:3000/api/panel/oauth/google/callback` və `.../facebook/callback`

## 1. Google (Google Cloud)

1. https://console.cloud.google.com adresinə daxil olun və yeni layihə yaradın (ad: `panelim`).
2. Sol menyudan **Google Auth Platform → Branding** bölməsinə keçin və tətbiq adını (`panelim`), dəstək e-poçtunu və tətbiqin ana səhifəsini (`https://panelim.az`) yazın.
3. **Audience** bölməsində **External** seçin. **Publish app** düyməsi ilə tətbiqi "In production" vəziyyətinə keçirin; əks halda yalnız test istifadəçiləri girə bilər.
4. **Data Access** (Scopes) bölməsində `openid`, `.../auth/userinfo.email` və `.../auth/userinfo.profile` icazələrini əlavə edin.
5. **Clients → Create client** (və ya **Credentials → Create credentials → OAuth client ID**) seçin, tətbiq növü: **Web application**.
6. **Authorized redirect URIs** hissəsinə yuxarıdakı Google ünvanlarını əlavə edin.
7. Yaradılan **Client ID** və **Client secret** dəyərlərini köçürün.

## 2. Facebook (Meta Developers)

1. https://developers.facebook.com adresinə daxil olun, **My Apps → Create App** düyməsini basın.
2. Tətbiq növü kimi **Consumer** (və ya "Authenticate and request data from users") seçin və adını `panelim` yazın.
3. Tətbiq yaradıldıqdan sonra **Add product** bölməsindən **Facebook Login** məhsulunu əlavə edin, **Web** platformasını seçin.
4. **Facebook Login → Settings** bölməsində **Valid OAuth Redirect URIs** sahəsinə yuxarıdakı Facebook ünvanlarını əlavə edin və saxlayın.
5. **App settings → Basic** bölməsində **Privacy Policy URL** kimi `https://panelim.az/az/legal/privacy` yazın.
6. **App ID** və **App Secret** dəyərlərini köçürün (App Secret üçün "Show" düyməsini basın).
7. Tətbiq **Development** rejimindədir. Yalnız tətbiq adminləri və test istifadəçiləri giriş edə bilər. Başqa istifadəçilər üçün **App mode**-u **Live** rejiminə keçirin (`email` və `public_profile` icazələri üçün adətən App Review tələb olunmur).

## 3. Vercel-ə dəyişənlərin əlavə edilməsi

Vercel → **qeydai** layihəsi → **Settings → Environment Variables** bölməsində bu dörd dəyişəni əlavə edin (Environment: **Production**):

| Ad | Dəyər |
|---|---|
| `GOOGLE_CLIENT_ID` | Google-dan köçürülən Client ID |
| `GOOGLE_CLIENT_SECRET` | Google-dan köçürülən Client secret |
| `FACEBOOK_APP_ID` | Facebook App ID |
| `FACEBOOK_APP_SECRET` | Facebook App Secret |

İstəyə görə: `FACEBOOK_GRAPH_VERSION` (məsələn `v25.0`). Boş buraxsanız standart versiya işlədilir.

Dəyişənləri əlavə etdikdən sonra layihəni yenidən yerləşdirmək (redeploy) lazımdır. Bunu Claude-a deyin, o təsdiq istəyəcək.

## 4. Yoxlama

1. `https://panelim.az/az/login` səhifəsini açın və **Google ilə daxil ol** düyməsini basın.
2. Google/Facebook hesabınızla təsdiq edin. Uğurlu olsa, panelə yönləndiriləcəksiniz.
3. Əgər e-poçt artıq panelim-də qeydiyyatdan keçibsə, eyni hesaba qoşulacaq. Yoxdursa, yeni iş sahəsi avtomatik yaradılacaq.
4. Xəta olsa, giriş səhifəsində "tamamlanmadı" mesajı çıxacaq. Yenidən cəhd edin və ya Claude-a xəbər verin.

## Qeydlər

- Google yalnız təsdiqlənmiş e-poçtu qəbul edir. Facebook hesabında e-poçt paylaşılmasa, giriş rədd olunur.
- Sosial girişlə yaradılan hesabın şifrəsi təsadüfi və naməlumdur. Həmin hesaba yalnız Google və ya Facebook ilə daxil olmaq olar.
- Əgər e-poçt ilə şifrəli hesab artıq varsa, Google/Facebook girişi ilk dəfə həmin hesaba bağlanmazdan əvvəl şifrə soruşulur. Şifrə düzgün olduqda bağlanma bir dəfəlik olur və sonrakı girişlər birbaşa işləyir.
- Miqrasiya `db/migrations/0008_panel_oauth_linking.sql` deploy-dan əvvəl Neon-da tətbiq edilməlidir.

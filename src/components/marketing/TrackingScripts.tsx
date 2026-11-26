"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";

export type TrackingConfig = {
  gtmId: string | null;
  gaId: string | null;
  clarityId: string | null;
  metaPixelId: string | null;
  tiktokPixelId: string | null;
  linkedinPartnerId: string | null;
  bingUetId: string | null;
};

const SAFE_ID_RE = /^[A-Za-z0-9_-]{3,40}$/;

export function sanitizeTrackingId(raw: string | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed || !SAFE_ID_RE.test(trimmed)) return null;
  return trimmed;
}

export function readTrackingConfig(env: Record<string, string | undefined>): TrackingConfig {
  return {
    gtmId: sanitizeTrackingId(env.NEXT_PUBLIC_GTM_ID),
    gaId: sanitizeTrackingId(env.NEXT_PUBLIC_GA_ID),
    clarityId: sanitizeTrackingId(env.NEXT_PUBLIC_CLARITY_ID),
    metaPixelId: sanitizeTrackingId(env.NEXT_PUBLIC_META_PIXEL_ID),
    tiktokPixelId: sanitizeTrackingId(env.NEXT_PUBLIC_TIKTOK_PIXEL_ID),
    linkedinPartnerId: sanitizeTrackingId(env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID),
    bingUetId: sanitizeTrackingId(env.NEXT_PUBLIC_BING_UET_ID),
  };
}

function subscribeConsent(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("panelim:cookie-change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("panelim:cookie-change", cb);
  };
}

function getConsentSnapshot(): boolean {
  try {
    return Boolean(localStorage.getItem("panelim:cookie-accepted"));
  } catch {
    return false;
  }
}

function getServerConsentSnapshot(): boolean {
  return false;
}

const CONFIG: TrackingConfig = {
  gtmId: sanitizeTrackingId(process.env.NEXT_PUBLIC_GTM_ID),
  gaId: sanitizeTrackingId(process.env.NEXT_PUBLIC_GA_ID),
  clarityId: sanitizeTrackingId(process.env.NEXT_PUBLIC_CLARITY_ID),
  metaPixelId: sanitizeTrackingId(process.env.NEXT_PUBLIC_META_PIXEL_ID),
  tiktokPixelId: sanitizeTrackingId(process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID),
  linkedinPartnerId: sanitizeTrackingId(process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID),
  bingUetId: sanitizeTrackingId(process.env.NEXT_PUBLIC_BING_UET_ID),
};

/**
 * Consent-gated marketing & analytics tag loader matching Kommo's measurement stack
 * (GTM, GA4, Microsoft Clarity, Meta Pixel, TikTok Pixel, LinkedIn Insight Tag, Microsoft UET).
 * Renders nothing unless cookie consent is granted AND the corresponding NEXT_PUBLIC_* env var is set.
 */
export function TrackingScripts() {
  const consented = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getServerConsentSnapshot
  );

  if (!consented) return null;

  return (
    <>
      {CONFIG.gtmId && (
        <Script id="panelim-gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${CONFIG.gtmId}');`}
        </Script>
      )}

      {CONFIG.gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${CONFIG.gaId}`}
            strategy="afterInteractive"
          />
          <Script id="panelim-ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${CONFIG.gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {CONFIG.clarityId && (
        <Script id="panelim-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CONFIG.clarityId}");`}
        </Script>
      )}

      {CONFIG.metaPixelId && (
        <Script id="panelim-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${CONFIG.metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}

      {CONFIG.tiktokPixelId && (
        <Script id="panelim-tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var r="https://analytics.tiktok.com/i18n/pixel/events.js";var n=d.createElement("script");n.type="text/javascript";n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a)};ttq.load('${CONFIG.tiktokPixelId}');ttq.page();}(window,document,'ttq');`}
        </Script>
      )}

      {CONFIG.linkedinPartnerId && (
        <Script id="panelim-linkedin-insight" strategy="afterInteractive">
          {`_linkedin_partner_id="${CONFIG.linkedinPartnerId}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s);})(window.lintrk);`}
        </Script>
      )}

      {CONFIG.bingUetId && (
        <Script id="panelim-bing-uet" strategy="afterInteractive">
          {`(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${CONFIG.bingUetId}"};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","https://bat.bing.com/bat.js","uetq");`}
        </Script>
      )}
    </>
  );
}

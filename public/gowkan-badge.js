/**
 * GOWKAN Badge Widget
 * -----------------------------------------------------------------
 * Watermark/badge logo GOWKAN, posisi fixed di pojok kanan bawah.
 * Diklik -> redirect ke website GOWKAN.
 *
 * CARA PAKAI:
 * 1. Taruh file ini di folder public/ (atau folder static) project lu.
 * 2. Taruh juga logo GOWKAN (misal: gowkan-logo.png / .svg) di folder yang sama.
 * 3. Tinggal include script-nya sebelum </body>, contoh:
 *      <script src="/gowkan-badge.js"></script>
 *    (untuk Astro/Next.js, taruh file logo & script ini di folder "public",
 *    lalu import sekali di layout utama)
 * 4. Sesuaikan config di bawah (URL tujuan, path logo, posisi, ukuran).
 *
 * JANGAN diubah struktur intinya kalau cuma mau ganti config —
 * cukup edit bagian CONFIG di bawah ini aja.
 * -----------------------------------------------------------------
 */

(function () {
    "use strict";
  
    // ======================= CONFIG (edit di sini) =======================
    const CONFIG = {
      // Link tujuan saat badge diklik
      targetUrl: "https://gowkan.vercel.app",
  
      // Path/URL logo GOWKAN (ganti sesuai lokasi file logo di project ini)
      logoSrc: "/gowkan-logo.png",
  
      // Alt text untuk aksesibilitas
      altText: "Website dibuat oleh GOWKAN",
  
      // Posisi: "bottom-right" | "bottom-left" | "top-right" | "top-left"
      position: "bottom-right",
  
      // Jarak dari tepi layar (px)
      offset: "16px",
  
      // Ukuran badge (px)
      size: "48px",
  
      // Buka di tab baru?
      openInNewTab: true,
  
      // Tampilkan tooltip kecil saat hover
      tooltipText: "Dibuat oleh GOWKAN",
    };
    // =======================================================================
  
    function getPositionStyle(position, offset) {
      const styles = {
        "bottom-right": `bottom: ${offset}; right: ${offset};`,
        "bottom-left": `bottom: ${offset}; left: ${offset};`,
        "top-right": `top: ${offset}; right: ${offset};`,
        "top-left": `top: ${offset}; left: ${offset};`,
      };
      return styles[position] || styles["bottom-right"];
    }
  
    function injectStyles() {
      const styleId = "gowkan-badge-style";
      if (document.getElementById(styleId)) return; // cegah duplikat
  
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .gowkan-badge {
          position: fixed;
          ${getPositionStyle(CONFIG.position, CONFIG.offset)}
          width: ${CONFIG.size};
          height: ${CONFIG.size};
          z-index: 2147483647;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: pointer;
          text-decoration: none;
        }
        .gowkan-badge:hover {
          transform: scale(1.08);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        }
        .gowkan-badge img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .gowkan-badge::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: calc(100% + 8px);
          right: 0;
          background: #111;
          color: #fff;
          font-family: system-ui, sans-serif;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transform: translateY(4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .gowkan-badge:hover::after {
          opacity: 1;
          transform: translateY(0);
        }
        @media (max-width: 480px) {
          .gowkan-badge {
            width: calc(${CONFIG.size} * 0.85);
            height: calc(${CONFIG.size} * 0.85);
          }
        }
      `;
      document.head.appendChild(style);
    }
  
    function injectBadge() {
      // Cegah badge dobel kalau script ke-load lebih dari sekali
      if (document.querySelector(".gowkan-badge")) return;
  
      const link = document.createElement("a");
      link.href = CONFIG.targetUrl;
      link.className = "gowkan-badge";
      link.setAttribute("aria-label", CONFIG.altText);
      link.setAttribute("data-tooltip", CONFIG.tooltipText);
      if (CONFIG.openInNewTab) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
  
      const img = document.createElement("img");
      img.src = CONFIG.logoSrc;
      img.alt = CONFIG.altText;
      img.loading = "lazy";
  
      link.appendChild(img);
      document.body.appendChild(link);
    }
  
    function init() {
      injectStyles();
      injectBadge();
    }
  
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
  
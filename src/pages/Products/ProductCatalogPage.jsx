// pages/ProductCatalogPage.jsx
// Route: /product-catalog/:exportId
// npm install jszip file-saver html2canvas jspdf

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Spin, message, Tooltip, Popconfirm } from "antd";
import { MdDelete } from "react-icons/md";
import axios from "axios";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ── helpers ──────────────────────────────────────────────────────────────────
const calcPrices = (customerPrice, gst, margin) => {
  const cusNum = parseFloat(customerPrice) || 0;
  const gstRate = parseFloat(gst) || 18;
  const marginPct = parseFloat(margin) || 0;
  const priceAfterMargin = cusNum * (1 + marginPct / 100);
  const finalPrice = priceAfterMargin * (1 + gstRate / 100);
  return {
    offer: priceAfterMargin.toFixed(2),
    final: finalPrice.toFixed(2),
  };
};

// ── Image loader – improved, with CORS handling and multiple indices ────────
const loadSingleImageAsDataURL = (url) => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.88));
      } catch (err) {
        console.warn(`CORS / tainted canvas for ${url}`, err);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load image: ${url}`);
      resolve(null);
    };
    img.src = url;
  });
};

// Preloads images for an array of products, trying image indices in priority order.
// Returns an object: { dataURLs, originalURLs }
const preloadProductImages = async (products, priorityIndices = [0, 2]) => {
  const dataURLs = {};
  const originalURLs = {};

  await Promise.all(
    products.map(async (p) => {
      // Try indices in order until we get a working image
      for (const idx of priorityIndices) {
        const url = p.image_url?.[idx]?.url;
        if (!url) continue;
        const dataURL = await loadSingleImageAsDataURL(url);
        if (dataURL) {
          dataURLs[p.product_id] = dataURL;
          originalURLs[p.product_id] = url; // store the original URL for linking
          break;
        }
      }
    })
  );

  return { dataURLs, originalURLs };
};

// ── Item Level Margin Modal ───────────────────────────────────────────────────
const ItemMarginModal = ({
  products,
  appliedMargin,
  itemMargins: initialItemMargins,
  customMarginIds: initialCustomIds,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState(() => ({ ...initialItemMargins }));
  const [draftCustomIds, setDraftCustomIds] = useState(() => new Set(initialCustomIds));

  const handleChange = (productId, value) => {
    setDraft((prev) => ({ ...prev, [productId]: value }));
    setDraftCustomIds((prev) => {
      const next = new Set(prev);
      if (value === "" || value === null || value === undefined) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleRemoveCustom = (productId) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setDraftCustomIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: "85vh", animation: "modalIn 0.22s cubic-bezier(.34,1.56,.64,1) both" }}
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
                </svg>
              </div>
              <span className="font-bold text-gray-900 text-base">Item Level Margin</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="mx-6 mt-4 mb-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 shrink-0">
            <p className="text-sm font-semibold text-blue-800">Global Margin: {appliedMargin}%</p>
            <p className="text-xs text-blue-600 mt-0.5">Products will default to the global margin. You can customize individual margins below.</p>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-2 space-y-3">
            {products.map((p) => {
              const isCustom = draftCustomIds.has(p.product_id);
              const displayMargin = draft[p.product_id] !== undefined ? draft[p.product_id] : "";
              const effectiveMargin = isCustom ? parseFloat(draft[p.product_id]) || 0 : appliedMargin;
              const { final } = calcPrices(p.customer_price, p.gst, effectiveMargin);

              return (
                <div key={p.product_id} className={`flex items-center gap-4 border rounded-xl p-3 transition-all ${isCustom ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"}`}>
                  <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {p.image_url?.[0]?.url ? (
                      <img src={p.image_url[0].url} alt={p.name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display = "none"; }} />
                    ) : (
                      <div className="text-gray-300 text-[10px] text-center">No Img</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 leading-tight truncate">
                      {p.product_codeS_NO || ""}{p.product_codeS_NO ? " – " : ""}{p.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">HSN: {p.hsn_code || "N/A"}</p>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">Rs. {final}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <label className="text-xs text-gray-500 font-medium">Margin %</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min="0" max="100"
                        value={displayMargin} placeholder={String(appliedMargin)}
                        onChange={(e) => handleChange(p.product_id, e.target.value)}
                        className={`w-20 border rounded-lg px-2.5 py-1.5 text-sm text-center focus:outline-none focus:ring-2 transition ${isCustom ? "border-blue-400 focus:ring-blue-300 bg-white font-semibold text-blue-700" : "border-gray-300 focus:ring-blue-200"}`}
                      />
                      {isCustom && (
                        <Tooltip title="Reset to global margin">
                          <button onClick={() => handleRemoveCustom(p.product_id)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition text-gray-400">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </Tooltip>
                      )}
                    </div>
                    {isCustom && <span className="text-[10px] text-blue-500 font-medium">Custom</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/60">
            <p className="text-xs text-gray-400">{draftCustomIds.size} item{draftCustomIds.size !== 1 ? "s" : ""} with custom margin</p>
            <div className="flex items-center gap-2.5">
              <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition">Cancel</button>
              <button onClick={() => { onSave(draft, draftCustomIds); }} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm">Save Margins</button>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </>
  );
};

// ── Share Modal ───────────────────────────────────────────────────────────────
const ShareModal = ({ onClose, products, appliedMargin, getMarginForProduct }) => {
  const [busy, setBusy] = useState(null);
  const [activeTab, setActiveTab] = useState("export");

  const totalProducts = products.length;
  const customPriceProducts = products.filter((p) => parseFloat(p.mrp_price) > 0).length;
  const avgMRP = products.length
    ? (products.reduce((s, p) => s + (parseFloat(p.mrp_price) || 0), 0) / products.length).toFixed(2)
    : "0.00";
  const avgFinal = products.length
    ? (
      products.reduce((s, p) => {
        const { final } = calcPrices(p.customer_price, p.gst, getMarginForProduct(p.product_id));
        return s + parseFloat(final);
      }, 0) / products.length
    ).toFixed(2)
    : "0.00";

  const handlePrint = () => {
    onClose();
    setTimeout(() => window.print(), 200);
  };

  // Helper to get text width in mm (jsPDF doesn't have getTextWidth by default)
  const getTextWidthMM = (text, pdf, fontSize = undefined) => {
    const fsize = fontSize || pdf.internal.getFontSize();
    const font = pdf.internal.getFont();
    const width = pdf.getStringUnitWidth(text) * fsize / pdf.internal.scaleFactor;
    return width;
  };

  const buildPDF = async (withPrice) => {
    setBusy(withPrice ? "fullWithPrice" : "fullWithoutPrice");
    try {
      message.loading({ content: "Loading images…", key: "pdf-progress", duration: 0 });
      // Preload images using the improved function, try indices 2 and 0
      const { dataURLs } = await preloadProductImages(products, [2, 0]);

      message.loading({ content: "Generating PDF…", key: "pdf-progress", duration: 0 });

      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const gap = 5;
      const slotH = (pdfH - gap) / 2;

      const pages = [];
      for (let i = 0; i < products.length; i += 2) pages.push(products.slice(i, i + 2));

      const renderSlot = async (product) => {
        const margin = getMarginForProduct(product.product_id);
        const { final } = calcPrices(product.customer_price, product.gst, margin);
        const mrp = parseFloat(product.mrp_price) || 0;
        const imgDataURL = dataURLs[product.product_id] || "";
        const name = product.name || "";

        const wrap = document.createElement("div");
        wrap.style.cssText = `width:595px;height:420px;position:fixed;left:-9999px;top:0;background:#111;overflow:hidden;font-family:Arial,sans-serif;`;

        if (imgDataURL) {
          const bg = document.createElement("div");
          bg.style.cssText = `position:absolute;inset:0;background:url('${imgDataURL}') center/cover no-repeat;`;
          wrap.appendChild(bg);
        }

        const overlay = document.createElement("div");
        overlay.style.cssText = `position:absolute;inset:0;background:linear-gradient(to right, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.38) 55%, rgba(0,0,0,0.10) 100%);`;
        wrap.appendChild(overlay);

        const nameBlock = document.createElement("div");
        nameBlock.style.cssText = `position:absolute;top:28px;left:28px;max-width:100%;`;
        nameBlock.innerHTML = `<div style="font-size:28px;font-weight:900;color:#fff;font-style:italic;line-height:1.1;letter-spacing:-0.5px;text-shadow:0 2px 8px rgba(0,0,0,0.5);">${name}</div>`;
        wrap.appendChild(nameBlock);

        if (withPrice) {
          const priceRow = document.createElement("div");
          priceRow.style.cssText = `position:absolute;bottom:18px;left:20px;display:flex;gap:10px;`;
          const box = (label, val) => `
            <div style="background:rgba(255,255,255,0.13);border:1px solid rgba(255,255,255,0.3);border-radius:6px;padding:6px 14px;min-width:80px;text-align:center;backdrop-filter:blur(4px);">
              <div style="font-size:9px;color:#ccc;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">${label}</div>
              <div style="font-size:14px;font-weight:700;color:#fff;">Rs. ${val}</div>
            </div>`;
          priceRow.innerHTML = box("MRP", mrp || "N/A") + box("Final Price", final);
          wrap.appendChild(priceRow);
        }

        document.body.appendChild(wrap);
        const canvas = await html2canvas(wrap, { scale: 1.5, useCORS: true, backgroundColor: "#111", logging: false });
        document.body.removeChild(wrap);
        return canvas.toDataURL("image/jpeg", 0.88);
      };

      for (let pi = 0; pi < pages.length; pi++) {
        if (pi > 0) pdf.addPage();
        const pair = pages[pi];
        for (let si = 0; si < pair.length; si++) {
          const imgData = await renderSlot(pair[si]);
          const yPos = si * (slotH + gap);
          pdf.addImage(imgData, "JPEG", 0, yPos, pdfW, slotH);
          if (si === 0 && pair.length === 2) {
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.line(0, slotH, pdfW, slotH);
          }
        }
      }

      pdf.save(`catalog_${withPrice ? "with" : "without"}_price.pdf`);
      message.success({ content: "PDF downloaded!", key: "pdf-progress" });
    } catch (e) {
      console.error(e);
      message.error({ content: "PDF generation failed.", key: "pdf-progress" });
    } finally {
      setBusy(null);
    }
  };

  const buildDetailPDF = async () => {
    setBusy("detail");
    try {
      message.loading({ content: "Loading images…", key: "pdf-progress", duration: 0 });

      // Preload images once – we will use dataURLs for display and originalURLs for linking
      const { dataURLs, originalURLs } = await preloadProductImages(products, [0, 2]);

      message.loading({ content: "Building detail PDF…", key: "pdf-progress", duration: 0 });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const marginX = 10, marginY = 14, colGap = 5, rowGap = 4;
      const cardW = (pageW - marginX * 2 - colGap) / 2;
      const cardH = 40;
      const cardsPerRow = 2;
      const rowsPerPage = Math.floor((pageH - marginY * 2) / (cardH + rowGap));
      const cardsPerPage = rowsPerPage * cardsPerRow;

      const genDate = new Date().toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });

      const drawTimestamp = () => {
        pdf.setFontSize(7.5);
        pdf.setTextColor(160, 160, 160);
        pdf.setFont("helvetica", "normal");
        pdf.text(`Generated: ${genDate}`, pageW - marginX, 9, { align: "right" });
      };
      drawTimestamp();

      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const margin = getMarginForProduct(p.product_id);
        const { offer, final } = calcPrices(p.customer_price, p.gst, margin);
        const mrp = parseFloat(p.mrp_price) || 0;
        const gstRate = parseFloat(p.gst) || 18;

        const posOnPage = i % cardsPerPage;
        const col = posOnPage % cardsPerRow;
        const rowOnPage = Math.floor(posOnPage / cardsPerRow);

        if (i > 0 && posOnPage === 0) {
          pdf.addPage();
          drawTimestamp();
        }

        const cardX = marginX + col * (cardW + colGap);
        const cardY = marginY + rowOnPage * (cardH + rowGap);

        pdf.setDrawColor(210, 210, 210);
        pdf.setLineWidth(0.3);
        pdf.rect(cardX, cardY, cardW, cardH);

        const imgW = 28, imgH = 28, imgX = cardX + 0.2, imgY = cardY + 0.2;
        const imgDataURL = dataURLs[p.product_id];
        const imgOriginalURL = originalURLs[p.product_id];

        if (imgDataURL) {
          try {
            pdf.addImage(imgDataURL, "JPEG", imgX, imgY, imgW, imgH);
          } catch (err) {
            console.warn("Failed to add image to PDF", err);
            pdf.setFillColor(245, 245, 245);
            pdf.rect(imgX, imgY, imgW, imgH, "F");
          }
        } else {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(imgX, imgY, imgW, imgH, "F");
        }

        // Clickable link on image – use the original URL, not data URL
        if (imgOriginalURL) {
          pdf.link(imgX, imgY, imgW, imgH, { url: imgOriginalURL });
        }

        const textX = cardX + 29, textW = cardW - 29;
        let ty = cardY + 5;
        const productLabel = p.product_codeS_NO ? `${p.product_codeS_NO} :: ${p.name}` : p.name;
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 30, 30);
        const nameLines = pdf.splitTextToSize(productLabel, textW);
        nameLines.slice(0, 2).forEach((line) => {
          pdf.text(line, textX, ty);
          ty += 4.2;
        });

        pdf.setFontSize(6.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 100, 100);
        pdf.text(`HSN: ${p.hsn_code || "N/A"} | ${p.stocks_status || "Default"}`, textX, ty);
        ty += 3.8;
        pdf.text(`Days Needed: ${p.DaysNeeded || "1 Day"}`, textX, ty);
        if (p.product_url) {
          ty += 5;
          pdf.setFontSize(6.2);
          pdf.setTextColor(30, 100, 200);
          const linkText = "View Product";
          const linkW = getTextWidthMM(linkText, pdf);
          pdf.text(linkText, textX, ty);
          pdf.link(textX, ty - 5.9, linkW, 10, { url: p.product_url });
        }

        // Table
        const tableX = cardX, tableY = cardY + cardH - 12, tableW = cardW, rowH = 6;
        const cols = [
          { header: "Qty", value: "Price", w: tableW * 0.13 },
          { header: "MRP", value: `${mrp}`, w: tableW * 0.20 },
          { header: "Offer Price", value: `${offer}`, w: tableW * 0.24 },
          { header: "GST", value: `${gstRate}%`, w: tableW * 0.15 },
          { header: "Final Price", value: `${final}`, w: tableW * 0.28 },
        ];

        pdf.setFillColor(240, 240, 240);
        pdf.rect(tableX, tableY, tableW, rowH, "F");
        pdf.setDrawColor(210, 210, 210);
        pdf.setLineWidth(0.2);
        pdf.rect(tableX, tableY, tableW, rowH);
        pdf.setFontSize(6);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(60, 60, 60);
        let cx = tableX;
        cols.forEach((c, idx) => {
          pdf.text(c.header, cx + 1, tableY + 4);
          cx += c.w;
          if (idx < cols.length - 1) {
            pdf.line(cx, tableY, cx, tableY + rowH * 2);
          }
        });

        pdf.setFillColor(255, 255, 255);
        pdf.rect(tableX, tableY + rowH, tableW, rowH, "F");
        pdf.setDrawColor(210, 210, 210);
        pdf.rect(tableX, tableY + rowH, tableW, rowH);
        pdf.setFontSize(6);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(30, 30, 30);
        cx = tableX;
        cols.forEach((c) => {
          pdf.text(c.value, cx + 1, tableY + rowH + 4);
          cx += c.w;
        });
      }

      pdf.save("catalog_detail.pdf");
      message.success({ content: "Catalog PDF downloaded!", key: "pdf-progress" });
    } catch (e) {
      console.error(e);
      message.error({ content: "PDF generation failed.", key: "pdf-progress" });
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Product Catalog");
    const body = encodeURIComponent(`Hi,\n\nPlease find the product catalog with ${products.length} item(s) below.\n\nBest regards`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
    onClose();
  };

  const handleImagesZip = async () => {
    setBusy("zip");
    try {
      const zip = new JSZip();
      const imgFolder = zip.folder("product_images");
      let count = 0;
      await Promise.all(
        products.map(async (p, idx) => {
          const imgObj = p.image_url?.[0];
          if (!imgObj?.url) return;
          try {
            const resp = await fetch(imgObj.url);
            if (!resp.ok) return;
            const blob = await resp.blob();
            const ext = imgObj.url.split(".").pop().split("?")[0] || "jpg";
            imgFolder.file(`${p.product_codeS_NO || `product_${idx + 1}`}_img1.${ext}`, blob);
            count++;
          } catch (_) { }
        })
      );
      if (count === 0) { message.warning("No images found to download."); setBusy(null); return; }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "product_images.zip");
      message.success(`${count} image(s) packed into ZIP!`);
    } catch (e) {
      message.error("ZIP creation failed.");
    } finally {
      setBusy(null);
    }
  };

  // useEffect(() => {
  //   const handler = (e) => {
  //     if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); handlePrint(); }
  //   };
  //   window.addEventListener("keydown", handler);
  //   return () => window.removeEventListener("keydown", handler);
  // }, []);

  const btnBase = "w-full flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 text-sm font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
          style={{ maxHeight: "90vh", animation: "modalIn 0.22s cubic-bezier(.34,1.56,.64,1) both" }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-gray-900 text-base block leading-tight">Share & Export</span>
                <span className="text-xs text-gray-400">{totalProducts} product{totalProducts !== 1 ? "s" : ""} in catalog</span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0">
            <button
              onClick={() => setActiveTab("export")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${activeTab === "export" ? "bg-green-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Export Options
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${activeTab === "info" ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Catalog Info
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {activeTab === "export" && (
              <div className="px-5 py-4 flex flex-col gap-2.5">
                <button onClick={() => buildPDF(true)} disabled={!!busy} className={`${btnBase} bg-red-500 hover:bg-red-600 text-white shadow-sm`}>
                  {busy === "fullWithPrice" ? <SpinIcon /> : <PDFIcon />} Full Page PDF <span className="text-xs font-normal opacity-75 ml-auto">(with price)</span>
                </button>
                <button onClick={() => buildPDF(false)} disabled={!!busy} className={`${btnBase} bg-amber-400 hover:bg-amber-500 text-white shadow-sm`}>
                  {busy === "fullWithoutPrice" ? <SpinIcon /> : <PDFIcon />} Full Page PDF <span className="text-xs font-normal opacity-75 ml-auto">(no price)</span>
                </button>
                <button onClick={buildDetailPDF} disabled={!!busy} className={`${btnBase} bg-gray-900 hover:bg-gray-800 text-white shadow-sm`}>
                  {busy === "detail" ? <SpinIcon /> : <DetailIcon />} PDF with Details
                </button>
                <div className="border-t border-gray-100 my-0.5" />
                {/* <Tooltip title="Data Selected. Press Ctrl+C to copy and Ctrl+V to paste in your E-mail. Once done, you can refresh the page to get back to normal view.">
                  <button disabled={!!busy} className={`${btnBase} bg-blue-500 hover:bg-blue-600 text-white shadow-sm`}>
                    <EmailIcon /> Share Via Email
                  </button>
                </Tooltip> */}
                <button onClick={handlePrint} disabled={!!busy} className={`${btnBase} bg-gray-500 hover:bg-gray-600 text-white shadow-sm`}>
                  <PrintIcon />
                  <span>Print / Save as PDF</span>
                  <span className="ml-auto text-xs font-normal bg-white/20 px-1.5 py-0.5 rounded">Ctrl+P</span>
                </button>
                <button onClick={handleImagesZip} disabled={!!busy} className={`${btnBase} bg-rose-500 hover:bg-rose-600 text-white shadow-sm`}>
                  {busy === "zip" ? <SpinIcon /> : <ZipIcon />} Images as ZIP
                </button>
              </div>
            )}

            {activeTab === "info" && (
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs text-blue-500 font-medium mb-0.5">Total Products</p>
                    <p className="text-2xl font-bold text-blue-700">{totalProducts}</p>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <p className="text-xs text-green-500 font-medium mb-0.5">With MRP</p>
                    <p className="text-2xl font-bold text-green-700">{customPriceProducts}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                    <p className="text-xs text-amber-500 font-medium mb-0.5">Avg MRP</p>
                    <p className="text-xl font-bold text-amber-700">₹{avgMRP}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                    <p className="text-xs text-purple-500 font-medium mb-0.5">Avg Final Price</p>
                    <p className="text-xl font-bold text-purple-700">₹{avgFinal}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">All Products</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {products.map((p) => {
                      const margin = getMarginForProduct(p.product_id);
                      const { offer, final } = calcPrices(p.customer_price, p.gst, margin);
                      const mrp = parseFloat(p.mrp_price) || 0;
                      return (
                        <div key={p.product_id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-2.5 bg-gray-50/60">
                          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {p.image_url?.[0]?.url ? (
                              <img src={p.image_url[0].url} alt={p.name} className="w-full h-full object-contain" onError={(e) => { e.target.style.display = "none"; }} />
                            ) : (
                              <span className="text-gray-300 text-[9px]">N/A</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate leading-tight">
                              {p.product_codeS_NO ? `${p.product_codeS_NO} - ` : ""}{p.name}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">HSN: {p.hsn_code || "N/A"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-bold text-gray-900">₹{final}</p>
                            {mrp > 0 && <p className="text-[10px] text-gray-400 line-through">₹{mrp}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Export</p>
                  <div className="flex gap-2">
                    <button onClick={() => { setActiveTab("export"); }} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-1.5">
                      <PDFIcon /> Export PDF
                    </button>
                    <button onClick={handlePrint} className="flex-1 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-1.5">
                      <PrintIcon /> Print
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
};

// ── Icon helpers ──────────────────────────────────────────────────────────────
const PDFIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 18 15 15" />
  </svg>
);
const DetailIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
  </svg>
);
const EmailIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const PrintIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
const ZipIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const SpinIcon = () => (
  <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" strokeLinecap="round" strokeOpacity="0.4" />
    <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
const ProductCatalogPage = () => {
  const { id: exportId } = useParams();

  const [loading, setLoading] = useState(true);
  const [exportRecord, setExportRecord] = useState(null);
  const [products, setProducts] = useState([]);

  const [marginInput, setMarginInput] = useState("");
  const [appliedMargin, setAppliedMargin] = useState(0);

  const [itemMargins, setItemMargins] = useState({});
  const [customMarginIds, setCustomMarginIds] = useState(new Set());

  const [itemMarginModalOpen, setItemMarginModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [copyingClipboard, setCopyingClipboard] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`https://api.printe.in/api/pdf-exports/${exportId}`);
        const record = data?.data || null;
        setExportRecord(record);
        setProducts(record?.products || []);
      } catch {
        message.error("Failed to load product catalog.");
      } finally {
        setLoading(false);
      }
    };
    if (exportId) fetchData();
  }, [exportId]);

  const toggleAll = (checked) => {
    if (checked) setSelectedIds(new Set(products.map((p) => p.product_id)));
    else setSelectedIds(new Set());
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = products.length > 0 && selectedIds.size === products.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleDelete = (productId) => {
    setProducts((prev) => prev.filter((p) => p.product_id !== productId));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(productId); return n; });
  };

  const handleResetDeleted = () => {
    setProducts(exportRecord?.products || []);
    message.success("Deleted products restored.");
  };

  const handleApply = () => {
    const val = parseFloat(marginInput);
    if (isNaN(val) || val < 0 || val > 100) {
      message.warning("Enter a valid margin between 0 and 100.");
      return;
    }
    setAppliedMargin(val);
    message.success(`Global margin of ${val}% applied.`);
  };

  const handleReset = () => {
    setMarginInput("");
    setAppliedMargin(0);
    setItemMargins({});
    setCustomMarginIds(new Set());
    message.success("All margins reset.");
  };

  const getMarginForProduct = useCallback((productId) => {
    if (customMarginIds.has(productId) && itemMargins[productId] !== undefined) {
      return parseFloat(itemMargins[productId]) || 0;
    }
    return appliedMargin;
  }, [customMarginIds, itemMargins, appliedMargin]);

  const handleSaveItemMargins = (newItemMargins, newCustomIds) => {
    setItemMargins(newItemMargins);
    setCustomMarginIds(newCustomIds);
    setItemMarginModalOpen(false);
    message.success(`Margins saved. ${newCustomIds.size} item${newCustomIds.size !== 1 ? "s" : ""} with custom margin.`);
  };

  // ── Copy selected products as image to clipboard ──────────────────────────
  const handleCopySelectedToClipboard = useCallback(async () => {
    const selectedProducts = products.filter((p) => selectedIds.has(p.product_id));
    if (selectedProducts.length === 0) return;

    setCopyingClipboard(true);
    message.loading({ content: `Preparing ${selectedProducts.length} product(s)…`, key: "clipboard", duration: 0 });

    try {
      const { dataURLs } = await preloadProductImages(selectedProducts, [0, 2]);

      const container = document.createElement("div");
      container.style.cssText = `
        position:fixed;left:-9999px;top:0;
        width:860px;background:#ffffff;padding:16px;
        font-family:Arial,sans-serif;box-sizing:border-box;
      `;

      for (const product of selectedProducts) {
        const margin = getMarginForProduct(product.product_id);
        const { offer, final } = calcPrices(product.customer_price, product.gst, margin);
        const mrpNum = parseFloat(product.mrp_price) || 0;
        const gstRate = parseFloat(product.gst) || 18;
        const cachedImg = dataURLs[product.product_id];

        const card = document.createElement("div");
        card.style.cssText = `
          display:flex;gap:0;border:1px solid #e5e7eb;border-radius:10px;
          overflow:hidden;margin-bottom:14px;background:white;
          box-shadow:0 1px 4px rgba(0,0,0,0.07);
        `;

        const imgCol = document.createElement("div");
        imgCol.style.cssText = `
          width:160px;min-width:160px;background:#f9fafb;
          display:flex;align-items:center;justify-content:center;
          border-right:1px solid #f3f4f6;
        `;
        if (cachedImg) {
          const imgEl = document.createElement("img");
          imgEl.src = cachedImg;
          imgEl.style.cssText = "width:100%;height:160px;object-fit:contain;padding:8px;";
          imgCol.appendChild(imgEl);
        } else {
          imgCol.innerHTML = `<div style="color:#d1d5db;font-size:12px;text-align:center;padding:16px;">No Image</div>`;
        }
        card.appendChild(imgCol);

        const content = document.createElement("div");
        content.style.cssText = `flex:1;padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;`;
        const productLabel = product.product_codeS_NO ? `${product.product_codeS_NO} - ${product.name}` : product.name;

        content.innerHTML = `
          <div>
            <p style="font-weight:700;color:#111827;font-size:14px;margin:0 0 5px;line-height:1.4;">${productLabel}</p>
            <p style="font-size:12px;color:#6b7280;margin:0 0 3px;">
              Available in: <span style="color:#374151;font-weight:600;">${product.stocks_status || "Default"}</span>
            </p>
            <p style="font-size:12px;color:#6b7280;margin:0 0 10px;line-height:1.5;">
              HSN Code: ${product.hsn_code || "N/A"} | Days Need: ${product.DaysNeeded || "1 Day"}
            </p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:left;font-weight:600;color:#4b5563;white-space:nowrap;">MRP</th>
                <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:left;font-weight:600;color:#4b5563;white-space:nowrap;">Offer Price</th>
                <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:left;font-weight:600;color:#4b5563;white-space:nowrap;">GST</th>
                <th style="border:1px solid #e5e7eb;padding:6px 10px;text-align:left;font-weight:600;color:#4b5563;white-space:nowrap;">Final Price</th>
               </tr>
            </thead>
            <tbody>
              <tr style="background:white;">
                <td style="border:1px solid #e5e7eb;padding:6px 10px;color:#1f2937;font-weight:500;white-space:nowrap;">Rs. ${mrpNum || "N/A"}</td>
                <td style="border:1px solid #e5e7eb;padding:6px 10px;color:#1f2937;font-weight:500;white-space:nowrap;">Rs. ${offer}</td>
                <td style="border:1px solid #e5e7eb;padding:6px 10px;color:#4b5563;white-space:nowrap;">${gstRate} %</td>
                <td style="border:1px solid #e5e7eb;padding:6px 10px;color:#111827;font-weight:700;white-space:nowrap;">Rs. ${final}</td>
              </tr>
            </tbody>
          </table>
        `;
        card.appendChild(content);
        container.appendChild(card);
      }

      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
      document.body.removeChild(container);

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          message.success({ content: `✅ ${selectedProducts.length} product(s) copied to clipboard!`, key: "clipboard", duration: 3 });
        } catch (err) {
          console.error("Clipboard write failed:", err);
          message.error({ content: "Copy failed. Try using Chrome/Edge.", key: "clipboard" });
        }
        setCopyingClipboard(false);
      }, "image/png");

    } catch (e) {
      console.error(e);
      message.error({ content: "Failed to copy to clipboard.", key: "clipboard" });
      setCopyingClipboard(false);
    }
  }, [selectedIds, products, getMarginForProduct]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") { e.preventDefault(); setShareOpen(true); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedIds.size > 0) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        handleCopySelectedToClipboard();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, handleCopySelectedToClipboard]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" tip="Loading catalog…" />
      </div>
    );
  }

  if (!exportRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">Export record not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Global print styles ──────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .sticky {
            position: static !important;
          }
          .product-card-checkbox {
            display: none !important;
          }
          .product-card-delete {
            display: none !important;
          }
          .product-card-margin-badge {
            display: none !important;
          }
          .border-blue-400 {
            border-color: #e5e7eb !important;
            box-shadow: none !important;
          }
          #product-grid {
            padding: 8px !important;
          }
          #product-grid > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* ── Top control bar ─────────────────────────────────────────────── */}
      <div className="no-print sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-10 py-2.5 flex flex-wrap items-center gap-3">

        <div className="flex items-center gap-2">
          <input
            type="number" placeholder="margin %"
            value={marginInput} onChange={(e) => setMarginInput(e.target.value)}
            className="w-28 border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded transition" onClick={handleApply}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
            Apply
          </button>
          <button className="flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-sm font-semibold px-3 py-1.5 rounded transition" onClick={handleReset}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.49" />
            </svg>
            Reset
          </button>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setItemMarginModalOpen(true)}
          className={`flex items-center gap-1.5 border text-sm font-semibold px-3.5 py-1.5 rounded transition
            ${customMarginIds.size > 0 ? "bg-blue-50 border-blue-400 text-blue-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
          </svg>
          Item Level Margin
          {customMarginIds.size > 0 && (
            <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {customMarginIds.size}
            </span>
          )}
        </button>

        <button onClick={handleResetDeleted} className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm font-semibold px-3.5 py-1.5 rounded hover:bg-gray-50 transition">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.49" />
          </svg>
          Reset Deleted
        </button>

        <button onClick={() => setShareOpen(true)} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold px-3.5 py-1.5 rounded transition shadow-sm">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      </div>

      {/* ── Select/Deselect All bar ─────────────────────────────────────── */}
      <div className="no-print sticky top-12 z-20 px-10 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer w-fit select-none">
          <input
            type="checkbox" checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={(e) => toggleAll(e.target.checked)}
            className="w-4 h-4 accent-blue-600 cursor-pointer"
          />
          <span className="text-sm font-medium text-gray-700">Select/Deselect All</span>
          {selectedIds.size > 0 && (
            <span className="ml-1 text-xs text-blue-600 font-semibold">({selectedIds.size} selected)</span>
          )}
        </label>

        {/* {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Tooltip title="Copy selected products as image (Ctrl+C)">
              <button
                onClick={handleCopySelectedToClipboard}
                disabled={copyingClipboard}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow transition"
              >
                {copyingClipboard ? <SpinIcon /> : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
                Copy as Image
                <span className="ml-1 text-[10px] font-normal bg-white/20 px-1 py-0.5 rounded">Ctrl+C</span>
              </button>
            </Tooltip>
          </div>
        )} */}
      </div>

      {/* ── Product grid ─────────────────────────────────────────────────── */}
      <div id="product-grid" className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:px-20">
        {products.map((product) => {
          const margin = getMarginForProduct(product.product_id);
          const isCustomMargin = customMarginIds.has(product.product_id);
          const gstRate = parseFloat(product.gst) || 18;
          const cusNum = parseFloat(product.customer_price) || 0;
          const mrpNum = parseFloat(product.mrp_price) || 0;
          const { offer, final } = calcPrices(cusNum, gstRate, margin);
          const isSelected = selectedIds.has(product.product_id);

          return (
            <div
              key={product.product_id}
              className={`relative flex gap-0 border rounded-lg overflow-hidden bg-white transition-all
                ${isSelected ? "border-blue-400 shadow-md" : "border-gray-200 shadow-sm hover:shadow-md"}`}
            >
              <div className="product-card-checkbox absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(product.product_id)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </div>

              {margin > 0 && (
                <div className="product-card-margin-badge absolute top-3 left-8 z-10">
                  <span className={`text-[10px] ${isCustomMargin ? "bg-green-600" : "bg-blue-600"} text-white font-bold rounded-full px-1.5 py-0.5 leading-none`}>
                    {margin}%
                  </span>
                </div>
              )}

              <Popconfirm title="Delete Product" description="Are you sure?" onConfirm={() => handleDelete(product.product_id)} okText="Yes" cancelText="No" okButtonProps={{ danger: true }}>
                <button className="product-card-delete absolute top-2 right-2 z-10 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition shadow">
                  <MdDelete size={14} />
                </button>
              </Popconfirm>

              <div className="w-40 min-w-[160px] bg-gray-50 flex items-center justify-center border-r border-gray-100">
                {product.image_url?.length > 0 ? (
                  <Link to={product.image_url[2]?.url || product.image_url[0]?.url || ""} target="_blank" rel="noopener noreferrer">
                    <img
                      src={product.image_url[0]?.url || ""}
                      alt={product.name}
                      className="w-full h-full object-contain p-2"
                      style={{ maxHeight: 160 }}
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </Link>
                ) : (
                  <div className="text-gray-300 text-xs text-center p-4">No Image</div>
                )}
              </div>
              <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                <div className="pr-6">
                  <p className="font-bold text-gray-900 text-sm leading-snug mb-1">
                    {product.product_codeS_NO ? `${product.product_codeS_NO} - ${product.name}` : product.name}
                  </p>
                  <p className="text-xs text-gray-500 mb-0.5">
                    Available in: <span className="text-gray-700 font-medium">{product.stocks_status || "Default"}</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                    HSN Code: {product.hsn_code || "N/A"} | Days Need: {product.DaysNeeded || "1 Day"}
                  </p>
                </div>

                <table className="w-full border-collapse text-xs price-table">
                  <thead>
                    <tr className="bg-gray-50">
                      {["MRP", "Offer Price", "GST", "Final Price"].map((h) => (
                        <th key={h} className="border border-gray-200 px-2 py-1 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-800 font-medium whitespace-nowrap">Rs. {mrpNum || "N/A"}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-800 font-medium whitespace-nowrap">Rs. {offer}</td>
                      <td className="border border-gray-200 px-2 py-1.5 text-gray-600 whitespace-nowrap">{gstRate} %</td>
                      <td className="border border-gray-200 px-2 py-1.5 font-bold text-gray-900 whitespace-nowrap">Rs. {final}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {products.length === 0 && (
          <div className="col-span-2 py-20 flex flex-col items-center justify-center text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            <p className="text-base">No products in this catalog.</p>
          </div>
        )}
      </div>

      {itemMarginModalOpen && (
        <ItemMarginModal
          products={products}
          appliedMargin={appliedMargin}
          itemMargins={itemMargins}
          customMarginIds={customMarginIds}
          onSave={handleSaveItemMargins}
          onClose={() => setItemMarginModalOpen(false)}
        />
      )}

      {shareOpen && (
        <ShareModal
          onClose={() => setShareOpen(false)}
          products={products}
          appliedMargin={appliedMargin}
          getMarginForProduct={getMarginForProduct}
        />
      )}
    </div>
  );
};

export default ProductCatalogPage;
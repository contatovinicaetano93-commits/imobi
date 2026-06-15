"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { File, FileText, Image, X, Download, Eye } from "lucide-react";

const NAVY  = "#0C1A3D";
const ROYAL = "#1B4FD8";
const MINT  = "#4ADE80";

const j: CSSProperties = { fontFamily: "'Jost', sans-serif" };

type DocTab = {
  id: string;
  nome: string;
  url: string;
  mimeType: string;
  tipo?: string;
};

type Props = {
  documentos: DocTab[];
  onUpload?: () => void;
  altura?: number;
};

function docIcon(mimeType: string) {
  if (mimeType === "application/pdf") return <FileText size={13} />;
  if (mimeType.startsWith("image/")) return <Image size={13} />;
  return <File size={13} />;
}

function isS3Key(url: string) {
  return !url.startsWith("http://") && !url.startsWith("https://");
}

export function DocumentTabViewer({ documentos, onUpload, altura = 500 }: Props) {
  const [openIds, setOpenIds] = useState<string[]>(
    documentos.length > 0 ? [documentos[0].id] : []
  );
  const [activeId, setActiveId] = useState<string | null>(
    documentos.length > 0 ? documentos[0].id : null
  );

  const activeDoc = documentos.find((d) => d.id === activeId) ?? null;
  const visibleDocs = documentos.filter((d) => openIds.includes(d.id));

  function openTab(id: string) {
    if (!openIds.includes(id)) {
      setOpenIds((prev) => [...prev, id]);
    }
    setActiveId(id);
  }

  function closeTab(id: string) {
    const next = openIds.filter((oid) => oid !== id);
    setOpenIds(next);
    if (activeId === id) {
      setActiveId(next.length > 0 ? next[next.length - 1] : null);
    }
  }

  // Tabs that are not yet open (available to open)
  const closedDocs = documentos.filter((d) => !openIds.includes(d.id));

  const tabBase: CSSProperties = {
    ...j,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "0.45rem 0.85rem",
    fontSize: "0.78rem",
    fontWeight: 500,
    cursor: "pointer",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    color: `rgba(12,26,61,0.45)`,
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "all 0.12s",
  };

  const tabActive: CSSProperties = {
    ...tabBase,
    fontWeight: 700,
    color: NAVY,
    borderBottom: `2px solid ${MINT}`,
  };

  return (
    <div style={{ border: "1px solid rgba(12,26,61,0.1)", borderRadius: 14, overflow: "hidden", background: "white" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(12,26,61,0.08)", overflowX: "auto", background: "rgba(12,26,61,0.015)" }}>
        {visibleDocs.map((doc) => {
          const isActive = doc.id === activeId;
          return (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <button
                onClick={() => setActiveId(doc.id)}
                style={isActive ? tabActive : tabBase}
              >
                <span style={{ color: isActive ? ROYAL : "rgba(12,26,61,0.35)", display: "flex" }}>
                  {docIcon(doc.mimeType)}
                </span>
                <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.nome}
                </span>
              </button>
              <button
                onClick={() => closeTab(doc.id)}
                title="Fechar aba"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(12,26,61,0.3)",
                  padding: "0 0.35rem",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                  marginLeft: -4,
                }}
              >
                <X size={11} />
              </button>
            </div>
          );
        })}

        {/* "+" button — shows closed docs as options, or just calls onUpload */}
        {(closedDocs.length > 0 || onUpload) && (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <PlusMenu
              closedDocs={closedDocs}
              onOpen={openTab}
              onUpload={onUpload}
            />
          </div>
        )}
      </div>

      {/* Toolbar */}
      {activeDoc && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 1rem", borderBottom: "1px solid rgba(12,26,61,0.06)", background: "rgba(12,26,61,0.01)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ color: ROYAL, display: "flex", flexShrink: 0 }}>{docIcon(activeDoc.mimeType)}</span>
            <span style={{ ...j, fontSize: "0.8rem", fontWeight: 600, color: NAVY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {activeDoc.nome}
            </span>
            {activeDoc.tipo && (
              <span style={{ ...j, fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999, background: "rgba(27,79,216,0.08)", color: ROYAL, flexShrink: 0 }}>
                {activeDoc.tipo}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {!isS3Key(activeDoc.url) && (
              <a
                href={activeDoc.url}
                target="_blank"
                rel="noreferrer"
                title="Visualizar em nova aba"
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "0.3rem 0.7rem", borderRadius: 8, border: "1px solid rgba(12,26,61,0.12)", color: NAVY, textDecoration: "none", fontSize: "0.72rem", fontWeight: 600, background: "white" }}
              >
                <Eye size={12} />
                <span style={j}>Abrir</span>
              </a>
            )}
            <a
              href={isS3Key(activeDoc.url) ? `#download-${activeDoc.id}` : activeDoc.url}
              download={activeDoc.nome}
              title="Download"
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "0.3rem 0.7rem", borderRadius: 8, border: `1px solid rgba(27,79,216,0.25)`, color: ROYAL, textDecoration: "none", fontSize: "0.72rem", fontWeight: 600, background: "rgba(27,79,216,0.04)" }}
            >
              <Download size={12} />
              <span style={j}>Download</span>
            </a>
          </div>
        </div>
      )}

      {/* Viewer area */}
      <div style={{ minHeight: 200 }}>
        {!activeDoc ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: altura, color: "rgba(12,26,61,0.3)", gap: 10 }}>
            <File size={32} strokeWidth={1.2} />
            <p style={{ ...j, fontSize: "0.85rem" }}>Selecione um documento para visualizar</p>
          </div>
        ) : isS3Key(activeDoc.url) ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: altura, gap: 12, padding: "2rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(27,79,216,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <File size={22} color={ROYAL} strokeWidth={1.5} />
            </div>
            <p style={{ ...j, fontSize: "0.85rem", fontWeight: 600, color: NAVY, textAlign: "center" }}>
              Documento armazenado em S3.
            </p>
            <p style={{ ...j, fontSize: "0.78rem", color: "rgba(12,26,61,0.45)", textAlign: "center" }}>
              Use o botão download para acessar o arquivo.
            </p>
            <a
              href={`/api/proxy/storage/download?key=${encodeURIComponent(activeDoc.url)}`}
              download={activeDoc.nome}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.5rem 1.2rem", borderRadius: 10, background: ROYAL, color: "white", textDecoration: "none", fontSize: "0.8rem", fontWeight: 700 }}
            >
              <Download size={14} />
              <span style={j}>Baixar documento</span>
            </a>
          </div>
        ) : activeDoc.mimeType === "application/pdf" ? (
          <iframe
            src={activeDoc.url}
            title={activeDoc.nome}
            style={{ width: "100%", height: altura, border: "none", display: "block" }}
          />
        ) : activeDoc.mimeType.startsWith("image/") ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", height: altura, background: "rgba(12,26,61,0.02)" }}>
            <img
              src={activeDoc.url}
              alt={activeDoc.nome}
              style={{ maxWidth: "100%", maxHeight: altura - 32, objectFit: "contain", borderRadius: 6 }}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: altura, gap: 10, color: "rgba(12,26,61,0.35)" }}>
            <File size={28} strokeWidth={1.3} />
            <p style={{ ...j, fontSize: "0.82rem" }}>Pré-visualização não disponível para este tipo de arquivo.</p>
            <a
              href={activeDoc.url}
              download={activeDoc.nome}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "0.4rem 1rem", borderRadius: 8, border: `1px solid rgba(27,79,216,0.25)`, color: ROYAL, textDecoration: "none", fontSize: "0.78rem", fontWeight: 600 }}
            >
              <Download size={12} />
              <span style={j}>Download</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Plus menu ─────────────────────────────────────────────────────────────────

function PlusMenu({
  closedDocs,
  onOpen,
  onUpload,
}: {
  closedDocs: DocTab[];
  onOpen: (id: string) => void;
  onUpload?: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (closedDocs.length === 0 && !onUpload) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Abrir documento"
        style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(12,26,61,0.4)", padding: "0.45rem 0.65rem", fontSize: "1.1rem", lineHeight: 1, display: "flex", alignItems: "center", fontWeight: 400 }}
      >
        +
      </button>
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "white", border: "1px solid rgba(12,26,61,0.1)", borderRadius: 10, boxShadow: "0 4px 20px rgba(12,26,61,0.12)", minWidth: 200, overflow: "hidden" }}>
            {closedDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => { onOpen(doc.id); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 0.9rem", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid rgba(12,26,61,0.05)" }}
              >
                <span style={{ color: ROYAL, display: "flex", flexShrink: 0 }}>{docIcon(doc.mimeType)}</span>
                <span style={{ ...j, fontSize: "0.78rem", color: NAVY, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.nome}</span>
              </button>
            ))}
            {onUpload && (
              <button
                onClick={() => { onUpload(); setOpen(false); }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 0.9rem", background: "rgba(74,222,128,0.06)", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ ...j, fontSize: "0.78rem", fontWeight: 700, color: "#15803d" }}>+ Fazer upload de documento</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

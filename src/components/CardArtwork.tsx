"use client";

import Image from "next/image";
import { useState } from "react";
import type { Orientation } from "@/types";

interface ArtworkProps {
  src: string; fallbackSrc?: string; name: string; orientation?: Orientation; sizes?: string; priority?: boolean;
}

export function CardArtwork(props: ArtworkProps) {
  return <div className="card-artwork"><ArtworkImage key={props.src} {...props} /></div>;
}

function ArtworkImage({ src, fallbackSrc, name, orientation = "upright", sizes = "180px", priority = false }: ArtworkProps) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const imageSrc = src && !failedSources.includes(src) ? src
    : fallbackSrc && !failedSources.includes(fallbackSrc) ? fallbackSrc : "";
  return <>
    {imageSrc ? <Image src={imageSrc} alt={`${name}，${orientation === "reversed" ? "逆位" : "正位"}`} fill sizes={sizes} unoptimized priority={priority}
      className={orientation === "reversed" ? "rotate-180" : ""} onError={() => setFailedSources((failed) => [...failed, imageSrc])} />
      : <span className="card-image-fallback" role="img" aria-label={`${name}，牌面暂无法显示`}>牌面暂无法显示</span>}
  </>;
}

/**
 * 语义分块：按段落边界切分，超长段落再按句子切分，保留重叠保证上下文连贯。
 * 相比固定字符硬切，embedding 质量更高。
 */
export function chunkText(
  text: string,
  maxSize = 800,
  overlap = 100,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 按空行分段
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 10);

  if (paragraphs.length === 0) return [];

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;

    if (candidate.length > maxSize && current.length > 0) {
      chunks.push(current.trim());
      // 保留末尾重叠，确保上下文连贯
      const tail = current.length > overlap ? current.slice(-overlap) : current;
      current = `${tail}\n\n${para}`;
    } else {
      current = candidate;
    }
  }

  if (current.trim().length > 10) chunks.push(current.trim());

  // 对仍然超长的块按句子再切
  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxSize * 1.5) return [chunk];

    const sentences = chunk
      .split(/(?<=[。！？；.!?;])\s*/u)
      .filter((s) => s.trim().length > 0);

    const subChunks: string[] = [];
    let sub = "";

    for (const sent of sentences) {
      if (sub.length + sent.length > maxSize && sub.length > 0) {
        subChunks.push(sub.trim());
        sub = (sub.length > overlap ? sub.slice(-overlap) : sub) + sent;
      } else {
        sub += sent;
      }
    }
    if (sub.trim().length > 10) subChunks.push(sub.trim());

    return subChunks.length > 0 ? subChunks : [chunk];
  });
}

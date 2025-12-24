// Helper to log stream output line-by-line and collect lines
export default function attachLineLogger(
  stream: NodeJS.ReadableStream | null,
  logger: (line: string) => void,
) {
  if (!stream) {
    return () => [] as string[];
  }
  let buf = '';
  const lines: string[] = [];

  const onData = (chunk: Buffer | string) => {
    buf += chunk.toString();
    let index: number;
    while ((index = buf.indexOf('\n')) >= 0) {
      let line = buf.slice(0, index);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      logger(line);
      lines.push(line);
      buf = buf.slice(index + 1);
    }
  };

  stream.on('data', onData);

  // Return a flush function that will emit any remaining partial line and return all lines
  return () => {
    if (buf.length > 0) {
      let last = buf;
      if (last.endsWith('\r')) last = last.slice(0, -1);
      logger(last);
      lines.push(last);
      buf = '';
    }
    return lines;
  };
}

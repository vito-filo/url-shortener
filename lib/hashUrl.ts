import CRC32 from "@hqtsm/crc/crc-32/iso-hdlc";

export default function hashUrl(input: string): string {
  let crc = CRC32.init();
  crc = CRC32.update(crc, new TextEncoder().encode(input));
  crc = CRC32.finalize(crc);
  return crc.toString(16);
}

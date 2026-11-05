const MAX_TEXT_BYTES = 256 * 1024;
const TEXT_EXTENSION = /\.(txt|md|json|csv|tsv)$/i;

/** Read actual supported file contents; never imply a filename was analyzed as a document. */
export async function readChatAttachment(file: Pick<File, 'name' | 'size' | 'text'>): Promise<string> {
  if (!TEXT_EXTENSION.test(file.name)) throw new Error('Attach a TXT, MD, JSON, CSV, or TSV file. PDF and image analysis is not available here yet.');
  if (file.size > MAX_TEXT_BYTES) throw new Error('The text attachment must be 256 KB or smaller.');
  const content = await file.text();
  if (content.includes('\u0000')) throw new Error('This attachment is not a supported text file.');
  return `Attached text file: ${file.name}\n<attachment-data>\n${content}\n</attachment-data>`;
}

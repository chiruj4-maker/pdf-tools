import JSZip from 'jszip';

type FileToZip = {
    name: string;
    blob: Blob;
}

/**
 * Triggers a browser download for a given Blob.
 * @param blob The Blob to download.
 * @param fileName The desired name for the downloaded file.
 */
export function downloadFile(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}


/**
 * Creates a zip archive from an array of files.
 * @param files An array of objects, each with a name and a blob.
 * @returns A promise that resolves with the zip file as a Blob.
 */
export async function createZip(files: FileToZip[]): Promise<Blob> {
    const zip = new JSZip();
    files.forEach(file => {
        zip.file(file.name, file.blob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    return zipBlob;
}

/**
 * Helper: Convert a Hex String into a Uint8Array
 */
const hexToBytes = (hex) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
};

document.getElementById('isoInput').addEventListener('change', async function(e) {
    const file = e.target.files[0]; // Get the 3.7GB file
    if (!file) return;

    const targetHex = "49444D0102"; // "IDM"
    const pattern = hexToBytes(targetHex);
    const chunkSize = 10 * 1024 * 1024; // 10MB safety window
    const overlap = pattern.length - 1; 

    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: 'processed_' + file.name,
            types: [{ description: 'ISO File', accept: {'application/x-iso9660-image': ['.iso']} }],
        });
        const writable = await handle.createWritable();

        const status = document.getElementById('status');
        const progressBar = document.getElementById('progressBar');

        status.innerText = "Scanning chunks...";
        progressBar.style.display = "block";

        let offset = 0;
        let matchCount = 0;
        let currentChunkBuffers = []; // Stores parts of the current "IDM" chunk

        while (offset < file.size) {
            const buffer = await file.slice(offset, offset + chunkSize).arrayBuffer();
            let view = new Uint8Array(buffer);
            let lastProcessedIndex = 0;

            for (let i = 0; i <= view.length - pattern.length; i++) {
                let match = true;
                for (let j = 0; j < pattern.length; j++) {
                    if (view[i + j] !== pattern[j]) { match = false; break; }
                }

                if (match) {
                    // 1. If we were already collecting a chunk, it just ended
                    if (matchCount > 0 && matchCount <= 5) {
                        // Add data up to (but NOT including) this new match
                        currentChunkBuffers.push(view.slice(lastProcessedIndex, i));
                        
                        // Reassemble and Log the full chunk
                        const finalChunk = new Uint8Array(await new Blob(currentChunkBuffers).arrayBuffer());
                        console.log(`Chunk #${matchCount} (Starts with IDM):`, finalChunk);
                        
                        currentChunkBuffers = []; // Reset for next chunk
                    }

                    // 2. Start the new chunk
                    matchCount++;
                    lastProcessedIndex = i; // This new chunk begins AT the pattern
                }
            }

            // If we are currently inside one of the first 5 chunks, store the remainder of this 10MB window
            if (matchCount > 0 && matchCount <= 5) {
                currentChunkBuffers.push(view.slice(lastProcessedIndex, view.length - overlap));
            }

            // Stream to disk (Standard reassembly)
            const isLastChunk = (offset + chunkSize >= file.size);
            const dataToWrite = isLastChunk ? view : view.slice(0, view.length - overlap);
            await writable.write(dataToWrite);

            offset += (chunkSize - overlap);
            progressBar.value = (offset / file.size) * 100;
        }

        await writable.close();
        status.innerText = `Reassembly complete. Found ${matchCount} segments.`;

    } catch (err) {
        status.innerText = "Error: " + err.message;
        console.error(err);
    }
});

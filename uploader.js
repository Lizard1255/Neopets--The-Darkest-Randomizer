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

/**
 * Helper: Standard pattern matching function
 */
const isMatch = (view, index, pattern) => {
    if (!pattern || index + pattern.length > view.length) return false;
    for (let j = 0; j < pattern.length; j++) {
        if (view[index + j] !== pattern[j]) return false;
    }
    return true;
};

// --- CONFIGURATION: PARENT & CHILD RULES ---
const RULES = [{
    name: "IDM Primary Container",
    startPattern: hexToBytes("49444D0124"), // Parent Start
    stopPattern: hexToBytes("49444D0100"),  // Parent End
    subRules: [{
        name: "Game Logic Subchunk",
        start: hexToBytes("0800000000000000"),       // Child Start
        stop: hexToBytes("FFCDCDCD"),        // Child End
        modify: (data) => {
            // Check if the chunk is long enough for the 53rd hex pair (Index 52)
            if (data.length >= 53) {
                const byte53 = data[52]; 

                // --- SET YOUR HEX RANGE HERE ---
                const minValue = 0xa0; 
                const maxValue = 0xad; 

                if (byte53 >= minValue && byte53 <= maxValue) {
                    console.log(`Condition Met! 53rd byte is 0x${byte53.toString(16).toUpperCase()}`);
                    // Perform your modification here:

                    const randomByte = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;

                    data[52] = randomByte; 
                }
            }
            return data;
        }
    }]
}];

document.getElementById('isoInput').addEventListener('change', async function(e) {
    const files = e.target.files;
    if (!files.length) return;
    const file = files[0];

    // 1. Browser Security: Trigger Save Picker Immediately (User Gesture)
    let handle;
    try {
        handle = await window.showSaveFilePicker({
            suggestedName: 'modified_' + file.name,
            types: [{
                description: 'ISO Disk Image',
                accept: { 'application/x-iso9660-image': ['.iso'] },
            }],
        });
    } catch (err) {
        console.log("Save cancelled.");
        return;
    }

    const writable = await handle.createWritable();
    const status = document.getElementById('status');
    const progressBar = document.getElementById('progressBar');

    const chunkSize = 10 * 1024 * 1024; // 10MB
    const overlapSize = 1024; // Safety buffer for patterns
    let offset = 0;
    
    let activeRule = null;
    let currentChunkBuffers = [];
    let globalSubMatchCount = 0;

    status.innerText = "Processing 3.7GB ISO (Linear Stream)...";
    progressBar.style.display = "block";

    try {
        while (offset < file.size) {
            // Read current chunk
            const slice = file.slice(offset, offset + chunkSize);
            const buffer = await slice.arrayBuffer();
            let view = new Uint8Array(buffer);
            let lastProcessedIndex = 0;

            for (let i = 0; i < view.length; i++) {
                // Case 1: Looking for Parent Start
                if (activeRule === null) {
                    for (const rule of RULES) {
                        if (isMatch(view, i, rule.startPattern)) {
                            // Write everything BEFORE the start pattern to disk
                            await writable.write(view.slice(lastProcessedIndex, i));
                            
                            activeRule = rule;
                            currentChunkBuffers = [];
                            lastProcessedIndex = i;
                            break;
                        }
                    }
                } 
                // Case 2: Looking for Parent End
                else if (activeRule && isMatch(view, i, activeRule.stopPattern)) {
                    const stopLen = activeRule.stopPattern.length;
                    const endOfParentInView = i + stopLen;
                    
                    // Collect the final piece of the parent
                    currentChunkBuffers.push(view.slice(lastProcessedIndex, endOfParentInView));
                    
                    // Reassemble and scan for children
                    let parentData = new Uint8Array(await new Blob(currentChunkBuffers).arrayBuffer());
                    
                    for (const sub of activeRule.subRules) {
                        for (let s = 0; s <= parentData.length - sub.start.length; s++) {
                            if (isMatch(parentData, s, sub.start)) {
                                for (let end = s + sub.start.length; end <= parentData.length - sub.stop.length; end++) {
                                    if (isMatch(parentData, end, sub.stop)) {
                                        const subEndIndex = end + sub.stop.length;
                                        let fullChild = parentData.slice(s, subEndIndex);
                                        
                                        globalSubMatchCount++;
                                        let modifiedChild = sub.modify(fullChild);
                                        
                                        if (globalSubMatchCount <= 5) {
                                            console.log(`Sub-Match #${globalSubMatchCount} found!`, modifiedChild);
                                        }

                                        parentData.set(modifiedChild, s);
                                        s = subEndIndex - 1; 
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    // Write the entire (potentially modified) parent to the file
                    await writable.write(parentData);

                    // Reset state
                    currentChunkBuffers = [];
                    activeRule = null;
                    lastProcessedIndex = endOfParentInView;
                    i = endOfParentInView - 1; 
                }
            }

            // Cleanup at end of 10MB chunk
            if (activeRule === null) {
                // If not mid-parent, write remainder but keep overlap for next scan
                const isEOF = (offset + chunkSize >= file.size);
                const writeEnd = isEOF ? view.length : view.length - overlapSize;
                
                if (writeEnd > lastProcessedIndex) {
                    await writable.write(view.slice(lastProcessedIndex, writeEnd));
                }
                // Advance offset by exactly what was committed to disk
                offset += writeEnd; 
            } else {
                // If mid-parent, buffer everything since lastProcessedIndex and move offset fully
                currentChunkBuffers.push(view.slice(lastProcessedIndex));
                offset += view.length;
            }

            progressBar.value = (offset / file.size) * 100;
        }

        await writable.close();
        status.innerText = `Done! Processed ${globalSubMatchCount} chunks. File is valid.`;

    } catch (err) {
        status.innerText = "Error: " + err.message;
        console.error(err);
    }
});

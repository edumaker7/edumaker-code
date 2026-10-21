// Saving and opening project files through the File System Access API (Chrome, Edge).
// Once a project has been saved to or opened from a file, later saves write to that same file
// instead of asking again. Browsers without the API keep using download and <input type="file">.

const PROJECT_FILE_TYPES = [{
    description: 'Scratch 3 Project',
    accept: {'application/x.scratch.sb3': ['.sb3']}
}];
const OPENABLE_FILE_TYPES = [{
    description: 'Scratch Project',
    accept: {'application/x.scratch.sb3': ['.sb', '.sb2', '.sb3']}
}];

let currentHandle = null;

const supportsFilePicker = () =>
    typeof window !== 'undefined' &&
    typeof window.showSaveFilePicker === 'function' &&
    typeof window.showOpenFilePicker === 'function';

const isAbort = error => error && error.name === 'AbortError';

/**
 * Write a project to the file it was last saved to or opened from, or ask where to save it.
 * @param {Blob} content - the project file contents
 * @param {string} suggestedName - the file name to suggest when asking where to save
 * @returns {Promise<boolean>} true when the file was written, false when the user cancelled
 */
const saveProjectFile = async (content, suggestedName) => {
    try {
        const handle = currentHandle || await window.showSaveFilePicker({
            suggestedName,
            types: PROJECT_FILE_TYPES
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        currentHandle = handle;
        return true;
    } catch (error) {
        if (isAbort(error)) return false;
        throw error;
    }
};

/**
 * Ask the user for a project file to open.
 * @returns {Promise<{file: File, handle: object}|null>} the chosen file, or null when the user cancelled
 */
const pickProjectFile = async () => {
    try {
        const [handle] = await window.showOpenFilePicker({types: OPENABLE_FILE_TYPES, multiple: false});
        return {file: await handle.getFile(), handle};
    } catch (error) {
        if (isAbort(error)) return null;
        throw error;
    }
};

/**
 * Remember the file a project was opened from, so that saving writes back to it.
 * Older formats (.sb, .sb2) are not remembered, because saving always writes the .sb3 format.
 * @param {object|null} handle - the file handle, or null to forget the current one
 */
const setProjectFileHandle = handle => {
    currentHandle = handle && /\.sb3$/i.test(handle.name) ? handle : null;
};

const getProjectFileHandle = () => currentHandle;

export {
    getProjectFileHandle,
    pickProjectFile,
    saveProjectFile,
    setProjectFileHandle,
    supportsFilePicker
};

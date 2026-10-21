import {
    getProjectFileHandle,
    pickProjectFile,
    saveProjectFile,
    setProjectFileHandle,
    supportsFilePicker
} from '../../../src/lib/project-file-handle';

const makeHandle = name => {
    const writable = {write: jest.fn(() => Promise.resolve()), close: jest.fn(() => Promise.resolve())};
    return {
        name,
        writable,
        createWritable: jest.fn(() => Promise.resolve(writable)),
        getFile: jest.fn(() => Promise.resolve(new File(['data'], name)))
    };
};

const abortError = () => Object.assign(new Error('The user aborted a request.'), {name: 'AbortError'});

describe('project file handle', () => {
    afterEach(() => {
        delete window.showSaveFilePicker;
        delete window.showOpenFilePicker;
        setProjectFileHandle(null);
    });

    test('supportsFilePicker needs both pickers', () => {
        expect(supportsFilePicker()).toBe(false);
        window.showSaveFilePicker = jest.fn();
        expect(supportsFilePicker()).toBe(false);
        window.showOpenFilePicker = jest.fn();
        expect(supportsFilePicker()).toBe(true);
    });

    test('supportsFilePicker is false under browser automation', () => {
        window.showSaveFilePicker = jest.fn();
        window.showOpenFilePicker = jest.fn();
        Object.defineProperty(window.navigator, 'webdriver', {configurable: true, get: () => true});
        expect(supportsFilePicker()).toBe(false);
        delete window.navigator.webdriver;
    });

    test('the first save asks where to save, later saves write to the same file', async () => {
        const handle = makeHandle('game.sb3');
        window.showSaveFilePicker = jest.fn(() => Promise.resolve(handle));
        const content = new Blob(['project']);

        expect(await saveProjectFile(content, 'game.sb3')).toBe(true);
        expect(await saveProjectFile(content, 'game.sb3')).toBe(true);

        expect(window.showSaveFilePicker).toHaveBeenCalledTimes(1);
        expect(window.showSaveFilePicker.mock.calls[0][0].suggestedName).toBe('game.sb3');
        expect(handle.writable.write).toHaveBeenCalledTimes(2);
        expect(handle.writable.write).toHaveBeenCalledWith(content);
        expect(handle.writable.close).toHaveBeenCalledTimes(2);
        expect(getProjectFileHandle()).toBe(handle);
    });

    test('cancelling the save dialog resolves to false and remembers nothing', async () => {
        window.showSaveFilePicker = jest.fn(() => Promise.reject(abortError()));
        expect(await saveProjectFile(new Blob(['x']), 'a.sb3')).toBe(false);
        expect(getProjectFileHandle()).toBeNull();
    });

    test('other save errors are passed on', async () => {
        const handle = makeHandle('a.sb3');
        handle.createWritable = jest.fn(() => Promise.reject(new Error('permission denied')));
        setProjectFileHandle(handle);
        await expect(saveProjectFile(new Blob(['x']), 'a.sb3')).rejects.toThrow('permission denied');
    });

    test('pickProjectFile returns the file and its handle', async () => {
        const handle = makeHandle('story.sb3');
        window.showOpenFilePicker = jest.fn(() => Promise.resolve([handle]));
        const picked = await pickProjectFile();
        expect(picked.handle).toBe(handle);
        expect(picked.file.name).toBe('story.sb3');
    });

    test('cancelling the open dialog resolves to null', async () => {
        window.showOpenFilePicker = jest.fn(() => Promise.reject(abortError()));
        expect(await pickProjectFile()).toBeNull();
    });

    test('older project formats are not saved over', () => {
        setProjectFileHandle(makeHandle('old.sb2'));
        expect(getProjectFileHandle()).toBeNull();
        const handle = makeHandle('new.SB3');
        setProjectFileHandle(handle);
        expect(getProjectFileHandle()).toBe(handle);
    });

    test('a forgotten handle makes the next save ask again', async () => {
        const first = makeHandle('first.sb3');
        const second = makeHandle('second.sb3');
        window.showSaveFilePicker = jest.fn()
            .mockReturnValueOnce(Promise.resolve(first))
            .mockReturnValueOnce(Promise.resolve(second));
        await saveProjectFile(new Blob(['x']), 'first.sb3');
        setProjectFileHandle(null);
        await saveProjectFile(new Blob(['y']), 'second.sb3');
        expect(window.showSaveFilePicker).toHaveBeenCalledTimes(2);
        expect(getProjectFileHandle()).toBe(second);
    });
});

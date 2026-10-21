import {
    costumeLibraryContent,
    spriteLibraryContent,
    withoutTrademarkCharacters
} from '../../../src/lib/libraries/library-content';

describe('library content', () => {
    const trademarkNames = /\b(cat|gobo|pico|nano|giga|tera)\b/i;

    test('sprite library has no trademark characters', () => {
        expect(spriteLibraryContent.length).toBeGreaterThan(300);
        expect(spriteLibraryContent.filter(item => trademarkNames.test(item.name))).toEqual([]);
    });

    test('costume library has no trademark characters', () => {
        expect(costumeLibraryContent.length).toBeGreaterThan(800);
        expect(costumeLibraryContent.filter(item => trademarkNames.test(item.name))).toEqual([]);
    });

    test('only whole-word matches are removed', () => {
        const items = [{name: 'Cat'}, {name: 'Cat Flying'}, {name: 'Catcher'}, {name: 'Pico Walking'}, {name: 'Bear'}];
        expect(withoutTrademarkCharacters(items).map(item => item.name)).toEqual(['Catcher', 'Bear']);
    });
});

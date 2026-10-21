import spriteLibrary from './sprites.json';
import costumeLibrary from './costumes.json';

// The Scratch Cat, Gobo, Pico, Nano, Giga and Tera are Scratch trademarks (see TRADEMARK),
// so this edition of the editor leaves them out of its sprite and costume libraries.
const TRADEMARK_CHARACTER = /\b(cat|gobo|pico|nano|giga|tera)\b/i;

const withoutTrademarkCharacters = items => items.filter(item => !TRADEMARK_CHARACTER.test(item.name));

const spriteLibraryContent = withoutTrademarkCharacters(spriteLibrary);
const costumeLibraryContent = withoutTrademarkCharacters(costumeLibrary);

export {
    costumeLibraryContent,
    spriteLibraryContent,
    withoutTrademarkCharacters
};

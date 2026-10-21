import reducer, {localesInitialState, selectLocale, setLocales} from '../../../src/reducers/locales';
import {applyLocaleOverrides, localeOverrides} from '../../../src/lib/locale-overrides';

describe('locale overrides', () => {
    const published = {
        en: {'gui.menuBar.file': 'File', 'gui.sharedMessages.sprite': 'Sprite{index}'},
        ko: {'gui.menuBar.file': '파일'}
    };

    test('fill in Korean messages that the published translations lack', () => {
        const state = reducer(reducer(localesInitialState, setLocales(published)), selectLocale('ko'));
        expect(state.messages['gui.sharedMessages.sprite']).toBe('스프라이트{index}');
        expect(state.messages['gui.sharedMessages.loadFromComputerTitle']).toBe('컴퓨터에서 불러오기');
    });

    test('keep published messages that are not overridden', () => {
        const state = reducer(reducer(localesInitialState, setLocales(published)), selectLocale('ko'));
        expect(state.messages['gui.menuBar.file']).toBe('파일');
    });

    test('do not change other locales', () => {
        expect(applyLocaleOverrides(published).en).toBe(published.en);
    });

    test('do not add a locale that has no published messages', () => {
        expect(applyLocaleOverrides({en: published.en}).ko).toBeUndefined();
    });

    test('override every value with a non-empty string', () => {
        for (const value of Object.values(localeOverrides.ko)) {
            expect(typeof value).toBe('string');
            expect(value.trim()).not.toBe('');
        }
    });
});

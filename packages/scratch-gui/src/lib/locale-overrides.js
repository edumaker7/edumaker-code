// Messages that the published translations (scratch-l10n) are missing or have left untranslated.
// Entries here are merged over the published messages, so they can be removed once the
// published translations catch up.
const localeOverrides = {
    ko: {
        'gui.aria.aboutMenu': '정보 메뉴',
        'gui.aria.accountMenu': '계정 메뉴',
        'gui.aria.authorInfo': '{username}님의 프로젝트 "{projectTitle}"',
        'gui.aria.clearButton': '지우기',
        'gui.aria.editMenu': '편집 메뉴',
        'gui.aria.fileMenu': '파일 메뉴',
        'gui.aria.languageMenu': '언어 메뉴',
        'gui.aria.modeMenu': '모드 메뉴',
        'gui.aria.settingsMenu': '설정 메뉴',
        'gui.aria.startProjectButton': '프로젝트 시작하기',
        'gui.aria.stopProjectButton': '프로젝트 멈추기',
        'gui.confirmationPrompt.cancel': '아니요',
        'gui.confirmationPrompt.confirm': '예',
        'gui.connection.auto-scanning.updatePeripheralPrompt': '장치가 보이지 않으면 장치를 업데이트해야 할 수 있습니다.',
        'gui.connection.scanning.updatePeripheralPrompt': '장치가 보이지 않으면 장치를 업데이트해야 할 수 있습니다.',
        'gui.connection.updatePeripheral.doNotDisconnect':
            '업데이트가 끝날 때까지 이 페이지를 떠나거나 새로 고치지 말고, {extensionName}의 연결을 끊지 마세요. ',
        'gui.connection.updatePeripheral.updateMicroBitFirmware':
            '마이크로비트 펌웨어를 업데이트하려면 이 링크로 가세요: <a>{microBitFirmwareLink}</a>',
        'gui.debugModal.next': '다음',
        'gui.defaultProject.ding': '딩',
        'gui.menuBar.colorMode': '색상 모드',
        'gui.menuBar.myStuff': '내 작업실',
        'gui.menuBar.theme': '테마',
        'gui.sharedMessages.backdrop': '배경{index}',
        'gui.sharedMessages.costume': '모양{index}',
        'gui.sharedMessages.loadFromComputerTitle': '컴퓨터에서 불러오기',
        'gui.sharedMessages.pop': '팝',
        'gui.sharedMessages.replaceProjectWarning': '지금 프로젝트의 내용을 바꿀까요?',
        'gui.sharedMessages.sprite': '스프라이트{index}'
    }
};

/**
 * Merge the local overrides into a set of messages for every locale.
 * @param {object} messagesByLocale - messages keyed by locale, then by message id
 * @returns {object} a copy of `messagesByLocale` with the overrides applied
 */
const applyLocaleOverrides = messagesByLocale => {
    const merged = Object.assign({}, messagesByLocale);
    for (const [locale, overrides] of Object.entries(localeOverrides)) {
        if (merged[locale]) merged[locale] = Object.assign({}, merged[locale], overrides);
    }
    return merged;
};

export {
    applyLocaleOverrides,
    localeOverrides
};

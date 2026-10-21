import 'web-audio-test-api';

import React from 'react';
import configureStore from 'redux-mock-store';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import {LoadingState} from '../../../src/reducers/project-state';
import VM from '@scratch/scratch-vm';

import SBFileUploaderHOC from '../../../src/lib/sb-file-uploader-hoc.jsx';
import {IntlProvider} from 'react-intl';
import {fireEvent, waitFor} from '@testing-library/react';

describe('SBFileUploaderHOC', () => {
    const mockStore = configureStore();
    let store;
    let vm;

    // Wrap this in a function so it gets test specific states and can be reused.
    const getContainer = function () {
        const Component = () => <div />;
        return SBFileUploaderHOC(Component);
    };

    const unwrappedInstance = () => {
        const WrappedComponent = getContainer();
        // default starting state: looking at a project you created, not logged in
        const wrapper = renderWithIntl(
            <WrappedComponent
                projectChanged
                canSave={false}
                cancelFileUpload={jest.fn()}
                closeFileMenu={jest.fn()}
                requestProjectUpload={jest.fn()}
                userOwnsProject={false}
                vm={vm}
                onLoadingFinished={jest.fn()}
                onLoadingStarted={jest.fn()}
                onUpdateProjectTitle={jest.fn()}
                store={store}
            />
        );
        return wrapper;
    };

    beforeEach(() => {
        vm = new VM();
        store = mockStore({
            scratchGui: {
                projectState: {
                    loadingState: LoadingState.SHOWING_WITHOUT_ID
                },
                vm: {}
            },
            locales: {
                locale: 'en'
            }
        });
    });

    test('if isLoadingUpload becomes true, without fileToUpload set, will call cancelFileUpload', () => {
        const mockedCancelFileUpload = jest.fn();
        const WrappedComponent = getContainer();
        const {rerender} = renderWithIntl(
            <WrappedComponent
                projectChanged
                canSave={false}
                cancelFileUpload={mockedCancelFileUpload}
                closeFileMenu={jest.fn()}
                isLoadingUpload={false}
                requestProjectUpload={jest.fn()}
                store={store}
                userOwnsProject={false}
                vm={vm}
                onLoadingFinished={jest.fn()}
                onLoadingStarted={jest.fn()}
                onUpdateProjectTitle={jest.fn()}
            />
        );
        rerender(
            <IntlProvider
                locale="en"
                messages={{ }}
            >
                <WrappedComponent
                    projectChanged
                    canSave={false}
                    cancelFileUpload={mockedCancelFileUpload}
                    closeFileMenu={jest.fn()}
                    isLoadingUpload
                    requestProjectUpload={jest.fn()}
                    store={store}
                    userOwnsProject={false}
                    vm={vm}
                    onLoadingFinished={jest.fn()}
                    onLoadingStarted={jest.fn()}
                    onUpdateProjectTitle={jest.fn()}
                />
            </IntlProvider>
        );
        expect(mockedCancelFileUpload).toHaveBeenCalled();
    });

    describe('with the File System Access API', () => {
        const handle = {name: 'story.sb3', getFile: () => Promise.resolve(new File(['data'], 'story.sb3'))};

        beforeEach(() => {
            window.showSaveFilePicker = jest.fn();
            window.showOpenFilePicker = jest.fn(() => Promise.resolve([handle]));
            window.confirm = jest.fn(() => true);
        });

        afterEach(() => {
            delete window.showSaveFilePicker;
            delete window.showOpenFilePicker;
            delete window.confirm;
        });

        test('opens the browser file picker instead of a file input', async () => {
            const Component = ({onStartSelectingFileUpload}) => ( // eslint-disable-line react/prop-types
                <button onClick={onStartSelectingFileUpload}>{'open'}</button>
            );
            const WrappedComponent = SBFileUploaderHOC(Component);
            const {getByText} = renderWithIntl(
                <WrappedComponent
                    projectChanged
                    canSave={false}
                    closeFileMenu={jest.fn()}
                    store={store}
                    userOwnsProject={false}
                    vm={vm}
                    onLoadingFinished={jest.fn()}
                    onLoadingStarted={jest.fn()}
                    onUpdateProjectTitle={jest.fn()}
                />
            );
            fireEvent.click(getByText('open'));
            await waitFor(() => expect(store.getActions().length).toBeGreaterThan(0));
            expect(window.showOpenFilePicker).toHaveBeenCalledTimes(1);
            expect(document.querySelector('input[type="file"]')).toBeNull();
        });
    });
});

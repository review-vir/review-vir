import {describe, itCases} from '@augment-vir/test';
import {parseDescriptionUsers} from './parse-description-users.js';

describe(parseDescriptionUsers.name, () => {
    itCases(parseDescriptionUsers, [
        {
            it: 'handles "reviewer"',
            input: {
                triggerText: 'primary reviewer',
                bodyText: 'primary reviewer @my-name',
            },
            expect: ['my-name'],
        },
        {
            it: 'handles "reviewers"',
            input: {
                triggerText: 'primary reviewer',
                bodyText: 'primary reviewers @my-name',
            },
            expect: ['my-name'],
        },
        {
            it: 'handles multiple primaries separated by new lines',
            input: {
                triggerText: 'primary reviewer',
                bodyText:
                    'https://my-ticket-url.com/ticket-number\nPrimary reviewer:\n@my-name1\n@my-name2\nChanges\n\nadd primary reviewer support\n\nHow to test\nNothing to test.',
            },
            expect: [
                'my-name1',
                'my-name2',
            ],
        },
        {
            it: 'parses code owners from a markdown heading',
            input: {
                triggerText: 'code owner',
                bodyText:
                    'https://my-ticket-url.com/ticket-number\n## Code Owners\n@my-name1\n@my-name2\nChanges\n\nadd primary reviewer support\n\nHow to test\nNothing to test.',
            },
            expect: [
                'my-name1',
                'my-name2',
            ],
        },
        {
            it: 'handles multiple primaries separated by commas',
            input: {
                triggerText: 'primary reviewer',
                bodyText:
                    'https://my-ticket-url.com/ticket-number\nPrimary reviewer: @my-name1, @my-name2\nChanges\n\nadd primary reviewer support\n\nHow to test\nNothing to test.',
            },
            expect: [
                'my-name1',
                'my-name2',
            ],
        },
        {
            it: 'handles multiple primaries separated by commas and space',
            input: {
                triggerText: 'primary reviewer',
                bodyText:
                    'https://my-ticket-url.com/ticket-number\nPrimary reviewer: @my-name1 , @my-name2\nChanges\n\nadd primary reviewer support\n\nHow to test\nNothing to test.',
            },
            expect: [
                'my-name1',
                'my-name2',
            ],
        },
        {
            it: 'ignores a later tag',
            input: {
                triggerText: 'primary reviewer',
                bodyText: '**Primary Reviewer**: @person Changes - ask @another for help',
            },
            expect: [
                'person',
            ],
        },
        {
            it: 'handles no reviewers',
            input: {
                triggerText: 'primary reviewer',
                bodyText:
                    'https://my-ticket-url.com/ticket-number\nPrimary rev name1\n@my-name2\nChanges\n\nadd primary reviewer support\n\nHow to test\nNothing to test.',
            },
            expect: [],
        },
        {
            it: 'handles markdown formatting',
            input: {
                triggerText: 'primary reviewer',
                bodyText:
                    'https://my-ticket-url.com/ticket-number\n**Primary reviewer**: @name1\n@my-name2\nChanges\n\nadd primary reviewer support\n\nHow to test\nNothing to test.',
            },
            expect: [
                'name1',
                'my-name2',
            ],
        },
    ]);
});

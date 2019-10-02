require('dotenv').config()
const test = require('ava');


const username = process.env.USERNAME;
const password = process.env.PASSWORD;

console.log(username, password);

test('user exist', t => {
    t.true(Boolean(username));
});

test('password exist', t => {
    t.true(Boolean(password));
});

test('Get Instagram Account', async t => {
    const InstagraApi = require('../instagram.js');
    const Instagram = new InstagraApi();

    Instagram.csrfToken = await Instagram.getCsrfToken();
    Instagram.sessionId = await Instagram.auth(username, password);

    const data = await Instagram.getUserDataByUsername('getnerdify');
    const userId = data.graphql.user.id;

    t.is(userId, '7696780203');
});

# instagram-nodejs
Auth and get followers on instagram with nodejs

###You can get instagram followers with next code:
```js
Instagram = new Instagram()


Instagram.getCsrfToken().then((csrf) =>
{
  Instagram.csrfToken = csrf;
}).then(() =>
{
  Instagram.auth('inst-your-username', 'inst-your-password').then(sessionId =>
  {
    Instagram.sessionId = sessionId

    Instagram.getUserDataByUsername('username-for-get').then((t) =>
    {
      let userId = JSON.parse(t).user.id
      Instagram.getUserFollowers(1436473509).then((t) =>
      {
        console.log(Object.keys(t))
      })
    })

  })
})
```

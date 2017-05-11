# instagram-nodejs
Auth and get followers on instagram with nodejs


### Important : you must update csrf token and sessionId only if password was changed

### To install from npm repository (I recommended use yarn, but you can use npm):
```
yarn add instagram-nodejs-without-api
```

### You can get instagram followers with next code:
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
      Instagram.getUserFollowers(JSON.parse(t).user.id).then((t) =>
      {
        console.log(t); // - instagram followers for user "username-for-get"
      })
    })

  })
})
```

### Follow/unfollow
```js
Inst = new Instagram()

Inst.csrfToken = 'your-csrf'
Inst.sessionId = 'your-session-id'
Inst.follow(3,0) //follow "kevin"
Inst.follow(3, 1) //unfollow "kevin"
````

### Like/unlike
````js
  //get media id by url and like
  Insta.getMediaIdByUrl('https://www.instagram.com/p/BT1ynUvhvaR/').then(r => Insta.like(r).then(d => console.log(d)))
  //get media id by url and unlike
  Insta.getMediaIdByUrl('https://www.instagram.com/p/BT1ynUvhvaR/').then(r => Insta.unlike(r).then(d => console.log(d)))
````

### Get feed
````js
  let pageFirst = Insta.getFeed(10).then(function(t)
  {
    let PageSecond = Insta.getFeed(10, Insta.getFeedNextPage(t)).then(function(t)
    {
      //two page
      console.log(t)
    })
  })
````
When you pass items counter param instagram create pagination tokens on all iterations and gives on every response end_cursor, which the need to pass on next feed request


You can get user id with Inst.getUserDataByUsername() method

Star this repository on github, please. Thank you

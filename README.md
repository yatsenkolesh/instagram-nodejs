# instagram-nodejs
Auth and get followers on instagram with nodejs

Join us with gitter: https://gitter.im/nodejs-instagram/Library

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

### Get user media
````js
  //... auth (look up)
  //for example: get 12 first media entries for "kevin"
  // 0 - if you need to get first page
  // next cursor : r.page_info.end_cursor
  Insta.getUserMedia(3, '0', 12).then(f => console.log(f))
````

### Get media by hashtags and locations
````js
  Insta.commonSearch('Kyiv').then(r =>
  {
    //get location id for Kyiv
    let locationId = r.places[0].place.location['pk']
    //search posts from Kyiv
    Insta.searchBy('location', locationId, '0', 12).then(r => console.log(r))
  })
  //search posts by hashtag "Eurovision"
  Insta.searchBy('hashtag', 'Eurovision').then(r => console.log(r))
````

When you pass items counter param instagram create pagination tokens on all iterations and gives on every response end_cursor, which the need to pass on next feed request


You can get user id with Inst.getUserDataByUsername() method

Star this repository on github, please. Thank you

/**
  * @author Alex Yatsenko
  * @link https://github.com/yatsenkolesh/instagram-nodejs
*/

"use-strict";

const fetch = require('node-fetch');
const formData = require('form-data');

module.exports = class Instagram {
  /**
    * Constructor
  */
  constructor(csrfToken, sessionId) {
    this.csrfToken = csrfToken
    this.sessionId = sessionId
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
    this.userIdFollowers = {};
    this.timeoutForCounter = 300
    this.timeoutForCounterValue = 30000
    this.receivePromises = {}
    this.searchTypes = ['location', 'hashtag']

    this.essentialValues = {
      sessionid   : undefined,
      ds_user_id  : undefined,
      csrftoken   : undefined,
      shbid       : undefined,
      rur         : undefined,
      mid         : undefined,
      shbts       : undefined,
      mcd         : undefined,
      ig_cb       : undefined,
      //urlgen      : undefined //this needs to be filled in according to my RE
    };
  }

  /**
    * User data by username
    * @param {String} username
    * @return {Object} Promise
  */
  getUserDataByUsername(username) {
    
    var cookie = ''

    var keys = Object.keys(this.essentialValues)
    for (var i = 0; i < keys.length; i++){
      var key = keys[i];
      cookie += key + '=' + this.essentialValues[key] + (i < keys.length - 1 ? '; ' : '')
    }


    var fetch_data = {
      'method': 'get',
      'headers':
      {
        'accept': 'text/html,application/xhtml+xml,application/xml;q0.9,image/webp,image/apng,*.*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'accept-langauge': 'en-US;q=0.9,en;q=0.8,es;q=0.7',
        'cookie': cookie,

        'origin': 'https://www.instagram.com',

        'referer': 'https://www.instagram.com/',
        'upgrade-insecure-requests': '1',
        
        'user-agent': this.userAgent,
      }
    }
    
    return fetch('https://www.instagram.com/' + username, fetch_data).then(res => res.text().then(function (data) {
      const regex = /window\._sharedData = (.*);<\/script>/;
      const match = regex.exec(data);
      if (typeof match[1] === 'undefined') {
        return '';
      }
      return JSON.parse(match[1]).entry_data.ProfilePage[0];
    }))
  }

  /**
    Is private check
    * @param {String} usernmae
  */
  isPrivate(username) {
    return this.getUserDataByUsername(username).then((data) =>
      data.user.is_private
    )
  }

  /**
    * User followers list
    * Bench - 1k followers/1 min
    * @param {Int} userId
    * @param {String} command
    * @param {String} Params
    * @param {Int} followersCounter counter of followers
    * @param {Boolean} selfSelf if call by self
    * @return {Object} array followers list
  */
  getUserFollowers(userId, command, params, followersCounter, selfSelf) {
    const self = this

    if (!selfSelf)
      self.userIdFollowers[userId] = []

    if (typeof self.receivePromises[userId] !== 'undefined' && !selfSelf)
      return 0

    command = !command ? 'first' : command
    params = !params ? 20 : params

    let queryString = 'followed_by.' + command + '(' + params + ') {';

    let postBody = 'ig_user(' + userId + ') {' + queryString + 'count,\
          page_info {\
            end_cursor,\
            has_next_page\
          },\
          nodes {\
            id,\
            is_verified,\
            followed_by_viewer,\
            requested_by_viewer,\
            full_name,\
            profile_pic_url,\
            username\
          }\
        }\
      }'

    let form = new formData();
    form.append('q', postBody)

    self.receivePromises[userId] = 1
    return fetch('https://www.instagram.com/query/',
      {
        'method': 'post',
        'body': form,
        'headers':
        {
          'referer': 'https://www.instagram.com/',
          'origin': 'https://www.instagram.com',
          'user-agent': self.userAgent,
          'x-instagram-ajax': '1',
          'x-requested-with': 'XMLHttpRequest',
          'x-csrftoken': self.csrfToken,
          cookie: ' sessionid=' + self.sessionId + '; csrftoken=' + self.csrfToken
        }
      }).then(res => {
        return res.text().then(function (response) {
          //prepare convert to json
          let json = response

          try {
            json = JSON.parse(response)
          }
          catch (e) {
            console.log('Session error')
            console.log(response)
            return [];
          }

          if (json.status == 'ok') {
            self.userIdFollowers[userId] = self.userIdFollowers[userId].concat(json.followed_by.nodes)

            if (json.followed_by.page_info.has_next_page) {
              return new Promise((resolve) => {
                let after = json.followed_by.page_info.end_cursor
                resolve(self.getUserFollowers(userId, 'after', after + ',20', 1, 1))
              },
                (reject) =>
                  console.log('Error handle response from instagram server(get followers request)')
              )
            }
            else {
              self.receivePromises[userId] = undefined
              return self.userIdFollowers[userId]
            }

          }
          else {
            return new Promise((resolve) => {
              resolve(self.getUserFollowers(userId, command, params, followersCounter, selfSelf))
            },
              (reject) =>
                console.log('Error handle response from instagram server(get followers request)')
            )
          }

        }).
          catch((e) => {
            console.log('Instagram returned:' + e)
          })
      })
  }

  /**
    * Get csrf token
    * @return {Object} Promise
  */
  getCsrfToken() {
    return fetch('https://www.instagram.com',
      {
        'method': 'get',
        'headers':
        {
          'accept': 'text/html,application/xhtml+xml,application/xml;q0.9,image/webp,image/apng,*.*;q=0.8',
          'accept-langauge': 'en-US;q=0.9,en;q=0.8,es;q=0.7',

          'origin': 'https://www.instagram.com',

          'referer': 'https://www.instagram.com/',
          'upgrade-insecure-requests': '1',
          
          'user-agent': this.userAgent,

          'cookie': 'ig_cb=1'
        }
      }).then( t => {
        let cookies = t.headers._headers['set-cookie']

        var keys = Object.keys(this.essentialValues)

        for (var i = 0; i < keys.length; i++){
          var key = keys[i];
          if (!this.essentialValues[key])
            for (let c in cookies)
              if (cookies[c].includes(key) && !cookies[c].includes(key + '=""')){
                var cookieValue = cookies[c].split(';')[0].replace(key + '=', '')
                this.essentialValues[key] = cookieValue
                break;
              }
        }
        
        return t.text();
      }).then( html => {
        var subStr = html;

        var startStr = '<script type="text/javascript">window._sharedData = ';
        var start = subStr.indexOf(startStr) + startStr.length;
        subStr = subStr.substr(start, subStr.length);
        
        subStr = subStr.substr(0, subStr.indexOf('</script>') - 1);

        var json = JSON.parse(subStr);

        this.rollout_hash = json.rollout_hash;

        return json.config.csrf_token;
      }).catch(() =>
        console.log('Failed to get instagram csrf token')
      )
  }

  /**
    * Session id by usrname and password
    * @param {String} username
    * @param {String} password
    * @return {Object} Promise
  */
 auth(username, password) {
  var formdata = 'username=' + username + '&password=' + password + '&queryParams=%7B%7D'

  var options = {
    method  : 'POST',
    body    : formdata,
    headers :
    {
      'accept'            : '*/*',
      'accept-encoding'   : 'gzip, deflate, br',
      'accept-language'   : 'sv,en-US;q=0.9,en;q=0.8,es;q=0.7',
      'content-length'    : formdata.length,
      'content-type'      : 'application/x-www-form-urlencoded',
      'cookie'            : 'ig_cb=' + this.essentialValues.ig_cb,
      'origin'            : 'https://www.instagram.com',
      'referer'           : 'https://www.instagram.com/',
      'user-agent'        : this.userAgent,
      'x-csrftoken'       : this.csrfToken,
      'x-instagram-ajax'  : this.rollout_hash,
      'x-requested-with'  : 'XMLHttpRequest',
      
    }
  }

  return fetch('https://www.instagram.com/accounts/login/ajax/', options).then(
  t => {
      let cookies = t.headers._headers['set-cookie']
       
      var keys = Object.keys(this.essentialValues)

      for (var i = 0; i < keys.length; i++){
        var key = keys[i];
        if (!this.essentialValues[key])
          for (let c in cookies) {
            if (cookies[c].includes(key) && !cookies[c].includes(key + '=""')){
              var cookieValue = cookies[c].split(';')[0].replace(key + '=', '')
              this.essentialValues[key] = cookieValue
              break;
            }
          }
      }

      return this.essentialsValues.sessionId;
    }).catch(() =>
      console.log('Instagram authentication failed (challenge required erro)')
    )
}

  /**
      * Registration for instagram, returning true or false
      * true if account was successfully created
      * @param {String} username
      * @param {String} password
      * @param {String} name
      * @param {String} email
      * @return {Boolen} account_created
      */
  reg(username, password, name, email) {
    let form = new formData();
    form.append('username', username)
    form.append('password', password)
    form.append('firstname', name)
    form.append('email', email)
    form.append('seamless_login_enabled', "1")

    return fetch('https://www.instagram.com/accounts/web_create_ajax/', {
      'method': 'post',
      'body': form,
      'headers': {
        'referer': 'https://www.instagram.com/',
        'origin': 'https://www.instagram.com',
        'user-agent': this.userAgent,
        'x-instagram-ajax': '1',
        'x-requested-with': 'XMLHttpRequest',
        'x-csrftoken': this.csrfToken,
        cookie: 'csrftoken=' + this.csrfToken
      }
    })
      .then(res => res.json())
      .then(json => {
        //console.log(json.errors);
        return json.account_created;
      })
      .catch(() => console.log('Instagram registration failed'))
  }


  /**
    * I did not want to implement this, but I need a stars on github
    * If you use this library - star this rep https://github.com/yatsenkolesh/instagram-nodejs
    * Thank you, bro
    * Follow/unfollow user by id
    * @param {int} userID
    * @param {boolean} isUnfollow
    * @return {object} Promise of fetch request
  */
  follow(userId, isUnfollow) {
    const headers =
    {
      'referer': 'https://www.instagram.com/',
      'origin': 'https://www.instagram.com',
      'user-agent': this.userAgent,
      'x-instagram-ajax': '1',
      'content-type': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      'x-csrftoken': undefined,
      cookie: ' sessionid=' + this.sessionId + '; csrftoken=' + this.csrfToken + '; mid=WPL0LQAEAAGG3XL5-xHXzClnpqA3; rur=ASH; mid=WRN1_AAEAAE07QksztCl3OCnLj8Y;'
    }

    return fetch('https://www.instagram.com/web/friendships/' + userId + (isUnfollow == 1 ? '/unfollow' : '/follow'),
      {
        'method': 'post',
        'headers': this.getHeaders()//headers
      }).then(res => {
        return res
      })
  }

  /**
    * @return {Object} default headers
   */
  getHeaders() {
    return {
      'referer': 'https://www.instagram.com/p/BT1ynUvhvaR/?taken-by=yatsenkolesh',
      'origin': 'https://www.instagram.com',
      'user-agent': this.userAgent,
      'x-instagram-ajax': '1',
      'x-requested-with': 'XMLHttpRequest',
      'x-csrftoken': this.csrfToken,
      cookie: ' sessionid=' + this.sessionId + '; csrftoken=' + this.csrfToken + ';'
    }
  }

  /**
    * Return user data by id
    * @param {Int} id
    * @return {Object} promise
  */
  getUserDataById(id) {
    let query = 'ig_user(' + id + '){id,username,external_url,full_name,profile_pic_url,biography,followed_by{count},follows{count},media{count},is_private,is_verified}'

    let form = new formData();
    form.append('q', query)

    return fetch('https://www.instagram.com/query/',
      {
        'method': 'post',
        'body': form,
        'headers': this.getHeaders()
      }).then(res =>
        res.json().then(t => t)
      )
  }

  /**
    * When you pass items counter param instagram create pagination
    * tokens on all iterations and gives on every response end_cursor, which the need to pass on next feed request
    *
    * This method return first "items" posts of feed
    * Coming soon will be opportunity  for get part of feed
    * On testing stage (+- all rights)
    * If you have a problems - create issue : https://github.com/yatsenkolesh/instagram-nodejs
    * @param {Int} items (default - 10)
    * @return {Object} Promise
  */
  getFeed(items, cursor) {
    items = items ? items : 10;
    return fetch('https://www.instagram.com/graphql/query/?query_id=17866917712078875&fetch_media_item_count=' + items + '&fetch_media_item_cursor=' + cursor + '&fetch_comment_count=4&fetch_like=10',
      {
        headers: this.getHeaders(),
      }).then(t =>
        // console.log(t)
        t.json().then(r => r)
      )
  }

  /**
    * Simple variable for get next page
    * @param {Object} json contents from this.getFeed
    * @return {String} if next page is not exists - false
  */
  getFeedNextPage(json) {
    let page = json.data.user.edge_web_feed_timeline.page_info

    return page.has_next_page ? page.end_cursor : false
  }

  /**
    * Attention: postId need transfer only as String (reason int have max value - 2147483647)
    * @example postID - '1510335854710027921'
    * @param {String} post id
    * @return {Object} Promse
  */
  like(postId) {
    return fetch('https://www.instagram.com/web/likes/' + postId + '/like/',
      {
        'method': 'POST',
        'headers': this.getHeaders()
      }).then(t =>
        t.json().then(r => r)
      )
  }

  /**
    * Attention: postId need transfer only as String (reason int have max value - 2147483647)
    * @example postID - '1510335854710027921'
    * @param {String} postId
    * @return {Object} Promse
  */
  unlike(postId) {
    return fetch('https://www.instagram.com/web/likes/' + postId + '/unlike/',
      {
        'method': 'POST',
        'headers': this.getHeaders()
      }).then(t =>
        t.json().then(r => r)
      )
  }


  /**
    * @example url = https://www.instagram.com/p/BT1ynUvhvaR/
    * @param {String} url
    * @return {Object} Promise
  */
  getMediaInfoByUrl(url) {
    return fetch('https://api.instagram.com/oembed/?url=' + url,
      {
        'headers': this.getHeaders()
      }).then(t => t.json().then(r => r))
  }

  /**
    * @example url = https://www.instagram.com/p/BT1ynUvhvaR/
    * @param {String} url
    * @return {Object} Promise
  */
  getMediaIdByUrl(url) {
    return this.getMediaInfoByUrl(url).then(t => t.media_id.split('_')[0])
  }

  /**
    * Get media user list on userId with pagination
    * @param {String} userId
    * @param {String} cursor (next cursor). Use 0, if you want to get first page
    * @param {Int} mediaCounter default - 12
    * @return {Object} Promise
  */
  getUserMedia(userId, cursor, mediaCounter) {
    cursor = cursor ? cursor : '0'
    mediaCounter = mediaCounter ? mediaCounter : 12
    let form = new formData()
    form.append('q', 'ig_user(' + userId + ') { media.after(' + cursor + ', ' + mediaCounter + ') {\
    count,\
    nodes {\
      __typename,\
      caption,\
      code,\
      comments {\
        count\
      },\
      comments_disabled,\
      date,\
      dimensions {\
        height,\
        width\
      },\
      display_src,\
      id,\
      is_video,\
      likes {\
        count\
      },\
      owner {\
        id\
      },\
      thumbnail_src,\
      video_views\
    },\
    page_info\
    }\
   }')
    form.append('ref', 'users::show')
    form.append('query_id', '17849115430193904') // this is static id. May be changed after rebuild, but now actually

    return fetch('https://www.instagram.com/query/',
      {
        headers: this.getHeaders(),
        method: 'post',
        body: form
      }).then(r => r.text().then(t => t))
  }

  /**
    * End cursor - t.entry_data.TagPage[0].tag.media.page_info['end_cursor']
    * Media(nodes) - t.entry_data.TagPage[0].tag.media['nodes']
    * @param {String} searchBy - location, hashtag
    * @param {String} q - location id, or hashtag
    * @param {String} cursor pagination cursor
    * @param {Int} mediaCounter
    * @return {Object} Promise
  */
  searchBy(searchBy, q, cursor, mediaCounter) {
    if (this.searchTypes.indexOf(searchBy) === false)
      throw 'search type ' + searchBy + ' is not found'

    //exclusion for hashtag if not cursor
    if (searchBy == 'hashtag' && !cursor) {
      return fetch('https://www.instagram.com/explore/tags/' + q + '/',
        {
          headers: this.getHeaders(),
        }).then(t => t.text().then(r => JSON.parse(r.match(/\<script type=\"text\/javascript\">window\._sharedData \=(.*)\;<\//)[1])))
    }

    let form = new formData()
    mediaCounter = mediaCounter ? mediaCounter : 12
    form.append('q', 'ig_' + searchBy + '(' + q + ') { media.after(' + cursor + ', ' + mediaCounter + ') {\
      count,\
      nodes {\
        __typename,\
        caption,\
        code,\
        comments {\
          count\
        },\
        comments_disabled,\
        date,\
        dimensions {\
          height,\
          width\
        },\
        display_src,\
        id,\
        is_video,\
        likes {\
          count\
        },\
        owner {\
          id\
        },\
        thumbnail_src,\
        video_views\
      },\
      page_info\
    }\
     }')

    form.append('ref', 'locations::show')
    form.append('query_id', '') //empty


    return fetch('https://www.instagram.com/query/',
      {
        headers: this.getHeaders(),
        method: 'post',
        body: form
      }).then(t => t.json().then(r => r))
  }

  /**
    * Place id path - r.places[0].place.location['pk'], r.places[1].place.location['pk'], ...
    * Common search returned locations, hashtags and users
    * @param {String} q
    * @return {Object} Promise
  */
  commonSearch(q, rankToken) {
    rankToken = rankToken ? rankToken : ''
    return fetch('https://www.instagram.com/web/search/topsearch/?context=blended&query=' + q + '&rank_token=' + rankToken,
      {
        headers: this.getHeaders() // no required
      }).then(t => t.json().then(r => r))
  }
}

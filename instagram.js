/**
  * @author Alex Yatsenko
  * @link https://github.com/yatsenkolesh/instagram-nodejs
*/

"use-strict";

const fetch = require('node-fetch');
const formData = require('form-data');
const delay = require('timeout-as-promise')

// class Instagram
module.exports = class Instagram
{
  /**
    * Constructor
  */
  constructor(csrfToken, sessionId)
  {
    this.csrfToken = csrfToken
    this.sessionId = sessionId
    this.userAgent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2900.1 Iron Safari/537.36'
    this.userIdFollowers = {};
    this.timeoutForCounter = 300
    this.timeoutForCounterValue = 30000
    this.receivePromises = {}
  }

  /**
    * User data by username
    * @param {String} username
    * @return {Object} Promise
  */
  getUserDataByUsername(username)
  {
    return fetch('https://www.instagram.com/'+username+'/?__a=1').then(res => res.text().then(function(data)
    {
      return data;
    }))
  }

  /**
    Is private check
    * @param {String} usernmae
  */
  isPrivate(username)
  {
    return this.getUserDataByUsername(username).then((data) =>
      data.user.is_private
    )
  }

  /**
    * User followers list
    * @param {Int} userId
    * @param {String} command
    * @param {String} Params
    * @param {Int} followersCounter counter of followers
    * @param {Boolean} selfSelf if call by self
    * @return {Object} array followers list
  */
  getUserFollowers(userId, command, params, followersCounter, selfSelf)
  {
    const self = this

      if(!selfSelf)
        self.userIdFollowers[userId] = []

      if(typeof self.receivePromises[userId] !== 'undefined' && !selfSelf)
        return 0

      command = !command ? 'first' : command
      params = !params ? 20 : params

      let queryString = 'followed_by.'+command+'('+params+') {';

      let postBody=  'ig_user('+userId+') {'+queryString+'count,\
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
        'method' : 'post',
        'body' : form,
        'headers' :
        {
          'referer': 'https://www.instagram.com/',
          'origin' : 'https://www.instagram.com',
          'user-agent' : self.userAgent,
          'x-instagram-ajax' : '1',
          'x-requested-with' : 'XMLHttpRequest',
          'x-csrftoken' : self.csrfToken,
          cookie :' sessionid='+self.sessionId+'; csrftoken='+self.csrfToken
      }
      }).then(res =>
        {
          return res.text().then(function(response)
          {
            //prepare convert to json
            let json = response

            try
            {
              json = JSON.parse(response)
            }
            catch(e)
            {
              console.log('Session error')
              console.log(response)
              return [];
            }

            if(json.status == 'ok')
            {
              self.userIdFollowers[userId] = self.userIdFollowers[userId].concat(json.followed_by.nodes)

              if(json.followed_by.page_info.has_next_page)
              {
                return new Promise((resolve) =>
                {
                  let after = json.followed_by.page_info.end_cursor
                  resolve(self.getUserFollowers(userId, 'after', after + ',20',1,1))
                },
                (reject) =>
                  console.log('Error handle response from instagram server(get followers request)')
                )
                }
                else
                {
                  self.receivePromises[userId] = undefined
                  return self.userIdFollowers[userId]
                }

            }
            else
            {
                return new Promise((resolve) =>
                {
                  resolve(self.getUserFollowers(userId, command, params, followersCounter, selfSelf))
                },
                (reject) =>
                  console.log('Error handle response from instagram server(get followers request)')
                )
            }

          }).
          catch((e) =>
          {
            console.log('Instagram returned:' + e)
          })
    })
  }

  /**
    * Get csrf token
    * @return {Object} Promise
  */
  getCsrfToken()
  {
    return fetch('https://www.instagram.com',
    {
      'method' : 'get',
      'headers' :
      {
        'referer': 'https://www.instagram.com/',
        'origin' : 'https://www.instagram.com',
        'user-agent' : this.userAgent,
      }
    }).then(
      t =>
      {
        let cookies = t.headers._headers['set-cookie']
        for(let i in cookies)
        {
          if(cookies[i].split('=')[0] == 'csrftoken')
            return cookies[i].split(';')[0].replace('csrftoken=','')
        }
      }
    ).catch(() =>
      console.log('Failed to get instagram csrf token')
    )
  }

  /**
    * Session id by usrname and password
    * @param {String} username
    * @param {String} password
    * @return {Object} Promise
  */
  auth(username, password)
  {
    let form = new formData();
    form.append('username', username)
    form.append('password', password)
    return fetch('https://www.instagram.com/accounts/login/ajax/',
    {
      'method' : 'post',
      'body' : form,
      'headers' :
      {
        'referer': 'https://www.instagram.com/',
        'origin' : 'https://www.instagram.com',
        'user-agent' : this.userAgent,
        'x-instagram-ajax' : '1',
        'x-requested-with' : 'XMLHttpRequest',
        'x-csrftoken': this.csrfToken,
        cookie: 'csrftoken=' + this.csrfToken
      }
    }).then(
      t =>
      {
        let cookies = t.headers._headers['set-cookie']
        for(let i in cookies)
        {
          if(cookies[i].split('=')[0] == 'sessionid')
            return cookies[i].split(';')[0].replace('sessionid=','')
        }
      }
    ).catch(() =>
      console.log('Instagram authentication failed')
    )
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
  follow(userId, isUnfollow)
  {
    const headers =
    {
      'referer': 'https://www.instagram.com/',
      'origin' : 'https://www.instagram.com',
      'user-agent' : this.userAgent,
      'x-instagram-ajax' : '1',
      'content-type': 'application/json',
      'x-requested-with' : 'XMLHttpRequest',
      'x-csrftoken' : undefined,
      cookie :' sessionid='+this.sessionId+'; csrftoken='+this.csrfToken + '; mid=WPL0LQAEAAGG3XL5-xHXzClnpqA3; rur=ASH; mid=WRN1_AAEAAE07QksztCl3OCnLj8Y;'
    }

    return fetch('https://www.instagram.com/web/friendships/'+userId+(isUnfollow == 1 ? '/unfollow' : '/follow'),
    {
      'method' : 'post',
      'headers' : headers
    }).then(res =>
    {
      return res
    })
  }

  /**
    * @return {Object} default headers
   */
  getHeaders()
  {
    return {
      'referer': 'https://www.instagram.com/p/BT1ynUvhvaR/?taken-by=yatsenkolesh',
      'origin' : 'https://www.instagram.com',
      'user-agent' : this.userAgent,
      'x-instagram-ajax' : '1',
      'x-requested-with' : 'XMLHttpRequest',
      'x-csrftoken' : this.csrfToken,
      cookie :' sessionid='+this.sessionId+'; csrftoken='+this.csrfToken + ';'
    }
  }

  /**
    * Return user data by id
    * @param {Int} id
    * @return {Object} promise
  */
  getUserDataById(id)
  {
    let query = 'ig_user('+id+'){id,username,external_url,full_name,profile_pic_url,biography,followed_by{count},follows{count},media{count},is_private,is_verified}'

    let form = new formData();
    form.append('q', query)

    return fetch('https://www.instagram.com/query/',
    {
      'method' : 'post',
      'body' : form,
      'headers' : this.getHeaders()
    }).then(res =>
      res.json().then(t => t)
    )
  }

  /**
    * This method return first "items" posts of feed
    * Coming soon will be opportunity  for get part of feed
    * On testing stage
    * If you have a problems - create issue : https://github.com/yatsenkolesh/instagram-nodejs
    * @param {Int} items
    * @return {Object} Promise
  */
  getFeed(items)
  {
    return fetch('https://www.instagram.com/graphql/query/?query_id=17866917712078875&fetch_media_item_count='+items+'&fetch_media_item_cursor=&fetch_comment_count=4&fetch_like=10',
    {
      headers: this.getHeaders(),
    }).then(t =>
      // console.log(t)
      t.text().then(r => r)
    )
  }

  /**
    * Attention: postId need transfer only as String (reason int have max value - 2147483647)
    * @example postID - '1510335854710027921'
    * @param {String} post id
    * @return {Object} Promse
  */
  like(postId)
  {
    return fetch('https://www.instagram.com/web/likes/'+postId+'/like/',
    {
      'method' : 'POST',
      'headers' : this.getHeaders()
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
  unlike(postId)
  {
    return fetch('https://www.instagram.com/web/likes/'+postId+'/unlike/',
    {
      'method' : 'POST',
      'headers' : this.getHeaders()
    }).then(t =>
      t.text().then(r => r)
    )
  }
}

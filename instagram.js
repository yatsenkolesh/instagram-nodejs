/**
  * @author Alex Yatsenko
  * @license BSD-3-Clause
  * @link https://github.com/yatsenkolesh/instagram-nodejs
*/

"use-strict";

const fetch = require('node-fetch');
const formData = require('form-data');

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
    * User followers list
    * @param {Int} userId
    * @param {String} command
    * @param {String} Params
    * @return {Object} array followers list
  */
  getUserFollowers(userId, command, params)
  {
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

    if(!this.userIdFollowers[userId])
      this.userIdFollowers[userId] = []

    const self = this;

    return fetch('https://www.instagram.com/query/',
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
        'x-csrftoken' : this.csrfToken,
        cookie :' sessionid='+this.sessionId+'; csrftoken='+this.csrfToken
    }
    }).then(res =>
      res.text().then(function(html)
      {
        //prepare convert to json
        let json = html

        try
        {
          json = JSON.parse(json)
        }
        catch(e)
        {
          console.log('Session error')
          return JSON.parse('{}');
        }
        self.userIdFollowers[userId] = self.userIdFollowers[userId].concat(json.followed_by.nodes)
        if(json.followed_by.page_info.has_next_page)
        {
          return new Promise((resolve) =>
          {
            let after = json.followed_by.page_info.end_cursor
            resolve(self.getUserFollowers(userId, 'after', after + ',20'))
          },
          (reject) =>
            console.log('Error handle response from instagram server(get followers request)')
        )
        }
        else
          return self.userIdFollowers[userId]
      }).
      catch((e) =>
      {
        console.log('Instagram returned:' + e)
      })
    )
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
    return fetch('https://www.instagram.com/web/friendships/'+userId+(isUnfollow ? '/unfollow' : '/follow'),
    {
      'method' : 'post',
      'headers' :
      {
        'referer': 'https://www.instagram.com/',
        'origin' : 'https://www.instagram.com',
        'user-agent' : this.userAgent,
        'x-instagram-ajax' : '1',
        'x-requested-with' : 'XMLHttpRequest',
        'x-csrftoken' : this.csrfToken,
        cookie :' sessionid='+this.sessionId+'; csrftoken='+this.csrfToken
      }
    }).then(res =>
    {
      return res
    })
  }
}

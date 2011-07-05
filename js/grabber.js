
/**
 * Profile Grabbers main responsibility to parse profiles data.
 */
ProfileGrabber = function() {
  this.domParser = new DOMParser();
  // For some reason $.ajax doesn't work with Facebook. Anyhow, jQuery will
  // be remove in the future, too overkill for what we need.
  this.xhr = new XMLHttpRequest();
  this.xhr.overrideMimeType('application/xml');
};

/**
 * Add a leading 0 if necessary.
 *
 * @param {number} num the number to format.
 * @return {string} formatted number with two digits.
 */
ProfileGrabber.prototype.twoDigitsFormat = function(num) {
  return (num < 10) ? '0'+ num : num;
};

/**
 * Parses friends birthday given in format YYYY-MM-DD (with the year),
 * or --MM-DD (without the year).
 *
 * @param birthday string representation, ex: January 1st or January 1st, 2009.
 * @return correctly formatted birthday.
 */
ProfileGrabber.prototype.parseBirthday = function(birthday) {
  var valid_birthday = birthday.match(/^\w+\s\d+(?:,\s(\d{4}))?$/)
  if (valid_birthday) {
    var date = new Date(birthday);
    var month = this.twoDigitsFormat(date.getMonth() + 1);
    var day = this.twoDigitsFormat(date.getDate());
    var year = '-';
    if (valid_birthday[1]) {
      year = valid_birthday[1];
    }
    birthday = year + '-' + month + '-' + day;
  }
  return birthday;
};

/**
 * Parses friends facebook address...
 * Note, some users don't have a unique textual profile id, if thats the case,
 * the url can be constructed via unique id instead.
 *
 * @param {string} fb The FB unique profile.
 * @param {string} id The FB unique ID.
 * @return {string} the url for the FB page.
 */
ProfileGrabber.prototype.parseFacebookURL = function(fb, id) {
  if (fb == '') {
    fb = 'facebook.com/profile.php?id=' + id;
  }
  return 'http://' + fb;
};

/**
 * Parses friends list of emails.
 *
 * @param {Array<DOM>} emails An array of emails.
 * @return {Array<string>} emails as an array of strings.
 */
ProfileGrabber.prototype.parseEmails = function(emails) {
  return emails.map(function() {
    return $(this).text();
  }).get();
};

/**
 * Parses friends list of phones.
 *
 * @param {Array<DOM>} phones An array of emails.
 * @return {Array<string>} phones as an array of strings.
 */
ProfileGrabber.prototype.parsePhones = function(phones) {
  return phones.map(function() {
    return $(this).text();
  }).get();
};

/**
 * Parses friends websites that they like to share.
 * This will remove the garbage from the beginning of the string if exists and
 * just extracts the href from each link.
 *
 * @param {Array<DOM>} websites An array of websites as a DOM.
 * @return {Array<string>} websites as an array of strings.
 */
ProfileGrabber.prototype.parseWebsites = function(websites) {
  return websites.map(function() {
    var url = decodeURIComponent($(this).attr('href'));
    // The patten extracts the URL from the following patterns if they match:
    //   - A clean URL
    //   - Prefixed with "/l.php?u=" stripped from URL.
    //   - Request parameters in the form of ?h=\w+&refid=\d+
    //   - Request parameters in an irregular form of &h=\w+&refid=\d+
    var pattern = /^(?:\/l.php\?u=)?(.*?)(?:(?:&amp;|\?|&)h=\w+(?:&amp;|&)refid=\d+)?$/;
    return url.replace(pattern, '$1');
  }).get();
};

/**
 * Fetches the friends information live.
 *
 * NOTE TO FUTURE SELF: If this extension breaks, it's probably because the
 * following lines no longer work.  Namely, the fragile selector access
 * being done below to get at the corresponding fields might need to be
 * updated.  Look at the actual FB page in question to make the right
 * fixes.
 *
 * @param {object} friend FB's internal friend storage.
 * @param {string} url Friends FB page.
 * @param {Function} callback This is needed somehow to do synchronous loading.
 *                            once a profile been fetched, calls this callback.
 */
ProfileGrabber.prototype.extractInfo = function(friend, url, callback) {
  that = this;
  this.xhr.onload = function() {
    var dom = that.xhr.responseXML;
    // Some users have problem reading the response type for XML. Perhaps this
    // is due to the mangled headers or perhaps firewall denying access.
    // This is a small fix to read it from responseText since it should be 
    // available then.
    if (!dom) {
      dom = that.domParser.parseFromString(that.xhr.responseText, 'application/xml');
    }
    else {
      dom = $(dom);
    }

    // Check if your not logged into the mobile page. This hack is dangerous.
    // But it makes sure none of your contacts are invalid. A better approach
    // would be to do an XHR to the main page, but that will waste resources.
    if ($('*', dom).html().indexOf('"/login.php') != -1) {
      friend.error = true;
      callback(friend);
    }
    
    // This is the extreme case, I believe there is a bug in Google Chrome the 
    // way it handles irregular Facebook pages. It just quits without indication
    // somehow the DOMParser fails and doesn't continue. 
    //        https://github.com/mohamedmansour/fb-exporter/issues/#issue/4
    //
    // Use jQuery to convert it automatically. This will throw and error on the
    // page every single time. I really hate this approach, but there is no way
    // to supress the error as far as I know without doing mucky stuff.
    if (!dom || dom.querySelector('parsererror')) {
      dom = $(that.xhr.responseText);
    }
    

    // To gather additional friend information, add the right selector here.
    var emails = $('td:last a', $('td.label:contains("Email")', dom).parent());
    var fb = $('td:last', $('td.label:contains("Profile")', dom).parent());
    var phones = $('td:last a', $('td.label:contains("Phone")', dom).parent());
    var address = $('td:last', $('td.label:contains("Address")', dom).parent());
    var skype = $('td:last', $('td.label:contains("Skype")', dom).parent());
    var gtalk = $('td:last', $('td.label:contains("Google Talk")', dom).parent());
    var hotmail = $('td:last', $('td.label:contains("Windows")', dom).parent());
    var yahoo = $('td:last', $('td.label:contains("Yahoo! Messenger")', dom).parent());
    var websites = $('td a', $('td.label:contains("Website")', dom).parent());
    var birthday = $('td:last', $('td.label:contains("Birthday")', dom).parent());

    // Storage for post processing. Cleanup and parse groups.
    friend.fb = that.parseFacebookURL(fb.text(), friend.id);
    friend.phones = that.parsePhones(phones);
    friend.address = address.text();
    friend.birthday = that.parseBirthday(birthday.text());
    friend.im = {};
    friend.im.skype = skype.text();
    friend.im.gtalk = gtalk.text();
    friend.im.yahoo = gtalk.text();
    friend.im.hotmail = hotmail.text();
    friend.emails = that.parseEmails(emails);
    friend.websites = that.parseWebsites(websites);
    callback(friend);
  };
  this.xhr.open('GET', url);
  this.xhr.send(null);
};

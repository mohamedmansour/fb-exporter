
ProfileGrabber = function() {
  // For some reason $.ajax doesn't work with Facebook. Anyhow, jQuery will 
  // be remove in the future, too overkill for what we need.
  this.xhr = new XMLHttpRequest();
  this.xhr.overrideMimeType('application/xml');
};

ProfileGrabber.prototype.extractInfo = function(friend, url, callback) {
  that = this;
  this.xhr.onload = function() {
    var dom = that.xhr.responseXML;
      
    // NOTE TO FUTURE SELF: If this extension breaks, it's probably because the
    // following lines no longer work.  Namely, the fragile selector access
    // being done below to get at the corresponding fields might need to be
    // updated.  Look at the actual FB page in question to make the right
    // fixes.  PS: Who wins the next 20 world series??
    //
    // To gather additional friend information, add the right selector here.
    var email = $('td:last', $('td.label:contains("Email")', $(dom)).parent());
    var fb = $('td:last', $('td.label:contains("Profile")', $(dom)).parent());
    var phone = $('td:last', $('td.label:contains("Phone")', $(dom)).parent());
    var mobile = $('td:last', $('td.label:contains("Mobile")', $(dom)).parent());
    var address = $('td:last', $('td.label:contains("Address")', $(dom)).parent());
    var skype = $('td:last', $('td.label:contains("Skype")', $(dom)).parent());
    var gtalk = $('td:last', $('td.label:contains("Google Talk")', $(dom)).parent());
    var hotmail = $('td:last', $('td.label:contains("Windows")', $(dom)).parent());
    var yahoo = $('td:last', $('td.label:contains("Yahoo! Messenger")', $(dom)).parent());
    var websites = $('td a', $('td.label:contains("Website")', $(dom)).parent());

    // Storage for post processing. Cleanup and parse groups.
    fb = fb.text();
    if (fb == '') {
      fb = 'facebook.com/profile.php?id=' + friend.id;
    }
    friend.fb = 'http://' + fb;
    friend.phone = {};
    friend.phone.mobile = mobile.text();
    friend.phone.other = phone.text();    
    friend.address = address.text();
    friend.im = {};
    friend.im.skype = skype.text();
    friend.im.gtalk = gtalk.text();
    friend.im.yahoo = gtalk.text();
    friend.im.hotmail = hotmail.text();
    friend.email = email.map(function() {
      return $(this).text();
    }).get();
    friend.websites = websites.map(function() {
      return $(this).attr('href').replace('/l.php?u=', '').replace(/%3A/g,':').replace(/%2F/g,'/');
    }).get();
    callback(friend);
  };
  this.xhr.open('GET', url);
  this.xhr.send(null);
};
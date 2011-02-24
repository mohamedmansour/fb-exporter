// Routines to handle gmail contact importing.

GoogleExport = function(friends) {
  this.requested_friends_to_import = friends;
  
  this.contact_group_id = 0;
  
  // This is a hash of email addresses that are ALREADY in the users google
  // contacts.  If a user already exists, then we want to avoid adding him as a
  // duplicate contact from facebook.
  this.google_contacts_hash = Object();
  
  // There is a delicate order of what gets called and when, when interacting
  // with the google contacts API.  By using a function call queue, we can easily
  // shift/unshift/push the next necessary call, and make the calls in the right
  // order.  The alternative is to use synchronous ajax, which I guess is OK
  // too...  but this feels cooler.
  this.function_queue = [];
  
  // This is for OAuth authentication with google, for contacts importation.
  this.oauth = ChromeExOAuth.initBackgroundPage({
    'request_url' : 'https://www.google.com/accounts/OAuthGetRequestToken',
    'authorize_url' : 'https://www.google.com/accounts/OAuthAuthorizeToken',
    'access_url' : 'https://www.google.com/accounts/OAuthGetAccessToken',
    'consumer_key' : 'anonymous',
    'consumer_secret' : 'anonymous',
    'scope' : 'https://www.google.com/m8/feeds/',
    'app_name' : 'Facebook Contact Exporter (Chrome Extension)'
  });

};

GoogleExport.CONTACT_GROUP_NAME = 'Imported from Facebook';
GoogleExport.GROUPS_FEED = 'https://www.google.com/m8/feeds/groups/default/full';
GoogleExport.CONTACTS_FEED = 'https://www.google.com/m8/feeds/contacts/default/full';


GoogleExport.prototype.process = function(callback) {
  this.callback = callback;
  
  console.log('startExportWithFriends');
  console.log(this.oauth.hasToken());
  this.function_queue.push(jQuery.proxy(this.ensureContactGroupExists, this));
  this.function_queue.push(jQuery.proxy(this.getGmailContacts, this));
  this.function_queue.push(jQuery.proxy(this.startExportingRequestedContacts, this));

  this.oauth.authorize(jQuery.proxy(this.didOAuthAuthorize, this));
};

GoogleExport.prototype.didOAuthAuthorize = function() {
  // Start doing things in the function queue.
  this.doNextAction();
};

GoogleExport.prototype.doNextAction = function() {
  // Execute the next function in the funciton queue.
  if (this.function_queue.length) {
    var next_function_to_call = this.function_queue.shift();
    next_function_to_call();
  }
};

GoogleExport.prototype.createAtomEntry = function() {
  // Create and return the raw <atom:entry> element, with some default
  // attributes and children.

  var entry = document.createElementNS('http://www.w3.org/2005/Atom', 'atom:entry');

  $(entry).attr('xmlns:atom', 'http://www.w3.org/2005/Atom')
          .attr('xmlns:gd', 'http://schemas.google.com/g/2005')
          .attr('xmlns:gcontact', 'http://schemas.google.com/contact/2008');

  return entry;
};

GoogleExport.prototype.createContactGroup = function() {
  // Create the "Imported From Facebook" contact group, ensuring that the
  // "Imported From Facebook" group does not exist already.

  console.log('createContactGroup');

  var entry = this.createAtomEntry();
  // The below XML derived from:
  // http://code.google.com/apis/contacts/docs/3.0/developers_guide_protocol.html#CreatingGroups
  $(entry).append($('<atom:category/>').attr('scheme', 'http://schemas.google.com/g/2005#kind')
                                       .attr('term', 'http://schemas.google.com/contact/2008#group'));
  $(entry).append(
      $('<atom:title/>').attr('type', 'text')
                        .text(GoogleExport.CONTACT_GROUP_NAME));
  $(entry).append(
      $('<gd:extendedProperty/>').attr('name', 'more info about the group')
          .append($('<info/>').text(
          'Exported using Facebook Friend Exporter (Chrome Extension)')));

  // Must do the following to get the <atom:entry> element as a string.  The
  // "div" root element will not be included, but is necessary to call html().
  var s = $('<div/>').append(entry).html();
  // Jquery doesn't give a damn about the case of the tags, making everything
  // lowercase.  We need to fix that, as google expects tags in the right case.
  s = s.replace(/extendedproperty/g, 'extendedProperty');

  var request = {
    'method': 'POST',
    'headers': {
      'GData-Version': '3.0',
      'Content-Type': 'application/atom+xml'
      //'Content-Type': 'application/json' // Not a valid input type
    },
    'parameters': {
      'alt': 'json'
    },
    'body': s
  };

  this.oauth.sendSignedRequest(GoogleExport.GROUPS_FEED, 
                                jQuery.proxy(this.onCreateContactGroup, this),
                                request);
};

GoogleExport.prototype.onCreateContactGroup = function(text, xhr) {
  console.log('onCreateContactGroup');
  var data = JSON.parse(text);
  this.saveContactGroupHrefFromGroupObject(data.entry);

  // Don't need to do anything with the function queue.
  this.doNextAction();
};

GoogleExport.prototype.ensureContactGroupExists = function() {
  console.log('ensureContactGroupExists');
  // Get the entire groups list (since there is no search querying based on
  // exact group name) and see if we've created this group already.  If the
  // group exists, avoid creating it again (because gmail will happily create
  // another one with the same name).
  this.oauth.sendSignedRequest(GoogleExport.GROUPS_FEED, 
                                jQuery.proxy(this.onGetContactGroups, this), 
                                { 'parameters' : { 'alt' : 'json' }});
};

GoogleExport.prototype.saveContactGroupHrefFromGroupObject = function(group) {
  // The group argument is an object representing the (possibly newly created)
  // group.  It is an object (already parsed from JSON).
  console.log("saveContactGroupHrefFromGroupObject");
  this.contact_group_id = group.id.$t;
};
      
GoogleExport.prototype.onGetContactGroups = function(text, xhr) {
  console.log("onGetContactGroups");

  // TODO: Assuming "text" is valid JSON at this point?  Is that wise?  Error
  // checking?
  var feed = JSON.parse(text);

  if ('entry' in feed.feed) {
    // Some entries (ie, groups) exist, see if one of them is our group.
    for (key in feed.feed.entry) {
      if (feed.feed.entry[key].title.$t == GoogleExport.CONTACT_GROUP_NAME) {
        this.saveContactGroupHrefFromGroupObject(feed.feed.entry[key]);
        return this.doNextAction();
      }
    }
  }

  // Group does not exist, need to create it before doing anything else.
  this.function_queue.unshift(jQuery.proxy(this.createContactGroup, this));
  this.doNextAction();
};


GoogleExport.prototype.logout = function() {
  this.oauth.clearTokens();
};


GoogleExport.prototype.onGetContacts = function(text, xhr) {
  console.log('onGetContacts');

  this.google_contacts_hash = Object();
  var data = JSON.parse(text);
  if (data.feed.entry) {
    for (var i = 0, entry; entry = data.feed.entry[i]; i++) {
      /*
      var contact = {
        'name' : entry['title']['$t'],
        'id' : entry['id']['$t'],
        'emails' : []
      };
      */

      if (entry['gd$email']) {
        var emails = entry['gd$email'];
        for (var j = 0, email; email = emails[j]; j++) {
          this.google_contacts_hash[email['address']] = entry['id']['$t'];
          //contact['emails'].push(email['address']);
        }
      }

      /*
      if (!contact['name']) {
        contact['name'] = contact['emails'][0] || "<Unknown>";
      }
      */
    }
  } else {
    console.log('No Contacts');
  }
  console.log(this.google_contacts_hash);

  this.doNextAction();
};

GoogleExport.prototype.getGmailContacts = function() {
  console.log('getGmailContacts');

  this.oauth.sendSignedRequest(GoogleExport.CONTACTS_FEED,
      jQuery.proxy(this.onGetContacts, this),
      {
        'parameters' : {
        'max-results' : 100000,
        'alt' : 'json',
        'group' : this.contact_group_id
      }
  });

  /*
  console.log(google.accounts.user.checkLogin(GOOGLE_SCOPE));
  var token = google.accounts.user.login(GOOGLE_SCOPE);
  console.log(token);
  
  var contactsFeedUri = 'https://www.google.com/m8/feeds/contacts/default/full';
  var query = new google.gdata.contacts.ContactQuery(contactsFeedUri);
  
  // Set the maximum of the result set to be 5
  query.setMaxResults(5);
  
  contactsService.getContactFeed(query, handleContactsFeed, handleError);
  */
};

GoogleExport.prototype.addFriendToGoogleContacts = function(friend) {
  // This assumes that the contact group has already been created.

  var entry = this.createAtomEntry();

  // The below XML derived from:
  // http://code.google.com/apis/contacts/docs/3.0/developers_guide_protocol.html#Creating
  $(entry).append($('<atom:category/>').attr('scheme', 'http://schemas.google.com/g/2005#kind')
                                       .attr('term', 'http://schemas.google.com/contact/2008#contact'));

  // Add the right stuff for each known attribute of friend.  For additional
  // entries, add the right code below.  See reference at: 
  // http://code.google.com/apis/gdata/docs/2.0/elements.html
  //
  // For list of defined attributes that are set by the scraping script, look
  // at contet_script.js.
  var title = $('<title/>').attr('type', 'text').text(friend.name);
  $(entry).append(title);
  var name = $('<gd:name/>')
          .append($('<gd:fullName/>').text(friend.name));
  $(entry).append(name);

  if (friend.fb) {
    // The friend's FB page, direct website.
    var gdim = $('<gcontact:website/>')
        .attr('label', 'Facebook Profile')
        .attr('href', friend.fb);
    $(entry).append(gdim);
  }
  console.log(friend);
  if (friend.phone.mobile) {
    var gdim = $('<gd:phoneNumber/>')
        .attr('rel', 'http://schemas.google.com/g/2005#mobile')
        .text(friend.phone.mobile);
    $(entry).append(gdim);
  }
  
  if (friend.phone.other) {
    var gdim = $('<gd:phoneNumber/>')
        .attr('rel', 'http://schemas.google.com/g/2005#other')
        .text(friend.phone.other);
    $(entry).append(gdim);
  }
  
  if (friend.address) {
    var gdim = $('<gd:postalAddress/>')
        .attr('rel', 'http://schemas.google.com/g/2005#home')
        .text(friend.address);
    $(entry).append(gdim);
  }
  
  // Instant Messengers.
  // TODO: Make it nicer by looping every single IM found instead of 
  //       dealing each protocol seperately.
  if (friend.im.skype) {
      var gdim = $('<gd:im/>')
          .attr('address', friend.im.skype)
          .attr('rel', 'http://schemas.google.com/g/2005#home')
          .attr('protocol', 'http://schemas.google.com/g/2005#SKYPE');
      $(entry).append(gdim);
  }
  
  if (friend.im.gtalk) {
      var gdim = $('<gd:im/>')
          .attr('address', friend.im.gtalk)
          .attr('rel', 'http://schemas.google.com/g/2005#home')
          .attr('protocol', 'http://schemas.google.com/g/2005#GOOGLE_TALK');
      $(entry).append(gdim);
  }
  
  if (friend.im.hotmail) {
      var gdim = $('<gd:im/>')
          .attr('address', friend.im.hotmail)
          .attr('rel', 'http://schemas.google.com/g/2005#home')
          .attr('protocol', 'http://schemas.google.com/g/2005#MSN');
      $(entry).append(gdim);
  }
  
  if (friend.im.yahoo) {
      var gdim = $('<gd:im/>')
          .attr('address', friend.im.yahoo)
          .attr('rel', 'http://schemas.google.com/g/2005#home')
          .attr('protocol', 'http://schemas.google.com/g/2005#YAHOO');
      $(entry).append(gdim);
  }
  
  if (friend.email) {
    // Handle multiple emails.  The .email property is a list of defined
    // email.
    var primary_email_set = false;
    for (key in friend.email) {
      var gdemail = $('<gd:email/>').attr('address', friend.email[key]);
      gdemail.attr('displayName', friend.name);
      gdemail.attr('rel', 'http://schemas.google.com/g/2005#home');
      if (!primary_email_set) {
        gdemail.attr('primary', 'true');
        primary_email_set = true;
      }
      $(entry).append(gdemail);
    }
  }

  if (friend.websites) {
    for (key in friend.websites) {
      var website = $('<gcontact:website/>')
                             .attr('label', 'homepage')
                             .attr('href', friend.websites[key]);
      $(entry).append(website);
    }
  }

  // Finally, add the friend to the right group (the one we (possibly) created
  // above, that houses the facebook exports).
  var groupMembershipInfo = $('<gcontact:groupMembershipInfo/>')
                            .attr('deleted', 'false')
                            .attr('href', this.contact_group_id);
  $(entry).append(groupMembershipInfo);

  // Must do the following to get the <atom:entry> element as a string.  The
  // "div" root element will not be included, but is necessary to call html().
  var s = $('<div/>').append(entry).html();

  // JavaScript treats attribute as case-insensative the case of the tags, making everything
  // lowercase.  We need to fix that, as google expects tags in the right case.
  // This really sucks.
  s = s.replace(/gd:fullname/g, 'gd:fullName');
  s = s.replace(/gd:phonenumber/g, 'gd:phoneNumber');
  s = s.replace(/gd:postaladdress/g, 'gd:postalAddress');
  s = s.replace(/displayname/g, 'displayName');
  s = s.replace(/gcontact:groupmembershipinfo/g, 'gcontact:groupMembershipInfo');

  var request = {
    'method': 'POST',
    'headers': {
      'GData-Version': '3.0',
      'Content-Type': 'application/atom+xml'
      //'Content-Type': 'application/json' // Not a valid input type
    },
    'parameters': {
      //'alt': 'json'
    },
    'body': s
  };

  this.oauth.sendSignedRequest(GoogleExport.CONTACTS_FEED,
                               jQuery.proxy(this.onAddContact, this),
                               request, friend);
}

GoogleExport.prototype.onAddContact = function(text, xhr, friend) {
  // This script runs in the context of background.html, so using
  // "worker_id" is valid.
  this.callback({
      finishedProcessingFriend: true,
      friend: friend,
      success: 1,
      message: 'Added to your Google Contacts!'
  });
};

GoogleExport.prototype.startExportingRequestedContacts = function() {
  console.log('startExportingRequestedContacts');

  // Prune out any friends that don't have any email addresses.  We use email
  // addresses to determine if a contact already exists in google contacts, so
  // friends with no emails are problematic.  Better to just not deal with
  // them.
  var friends_with_emails = this.requested_friends_to_import;

  // Keep a list of the friends that are requested for importation into Google
  // contacts that DON'T already exist there.  We determine non-duplicate
  // friends based on their email address already being in the Google contacts.
  var non_duplicate_friends_to_import = [];
  for (var j in friends_with_emails) {
    var friend = friends_with_emails[j];
    // See if the emails address for this friend matches one in the existing
    // google contacts.  If so, skip this friend.
    for (var i in friend.email) {
      var email = friend.email[i];

      if (!this.google_contacts_hash[email]) {
        non_duplicate_friends_to_import.push(friend);
        // Don't want to add the same friend twice, if this friend has another
        // email address, for example.
        break;
      }
    }
  }

  // The difference now between friends_with_emails and
  // non_duplicate_friends_to_import is the list of friends that we are NOT
  // adding because they already exist in google contacts.  We need to report
  // these back to the work tab as well.
  for (var i in non_duplicate_friends_to_import) {
    var friend = non_duplicate_friends_to_import[i];
    if ($.inArray(friend, friends_with_emails) != -1) {
      delete friends_with_emails[$.inArray(friend, friends_with_emails)];
    }
  }
  
  // friends_with_emails has now been pruned to remove all non-duplicate
  // emails.  The remaining friends_with_emails contains only duplicate friends
  // that we don't intend to add, so notify the work tab.
  for (var i in friends_with_emails) {
    var friend = friends_with_emails[i];
    this.callback({
        finishedProcessingFriend: true,
        friend: friend,
        success: 0,
        message: 'Not added: It looks like this friend is already in your Google Contacts!'
    });
  }

  // Now we're ready to add the remaining, non-duplicate friends to google
  // contacts.
  for (var i in non_duplicate_friends_to_import) {
    var friend = non_duplicate_friends_to_import[i];
    this.addFriendToGoogleContacts(friend);
  }

  this.doNextAction();
};

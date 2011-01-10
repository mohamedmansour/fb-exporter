// Routines to handle gmail contact importing.

var CONTACT_GROUP_NAME = "Imported from Facebook";
var CONTACT_GROUP_ID = 0;

// This is for OAuth authentication with google, for contacts importation.
var GOOGLE_SCOPE = 'https://www.google.com/m8/feeds/';
var oauth = ChromeExOAuth.initBackgroundPage({
  'request_url' : 'https://www.google.com/accounts/OAuthGetRequestToken',
  'authorize_url' : 'https://www.google.com/accounts/OAuthAuthorizeToken',
  'access_url' : 'https://www.google.com/accounts/OAuthGetAccessToken',
  'consumer_key' : 'anonymous',
  'consumer_secret' : 'anonymous',
  'scope' : GOOGLE_SCOPE,
  'app_name' : 'Facebook Contact Exporter (Chrome Extension)'
});
var GROUPS_FEED = 'https://www.google.com/m8/feeds/groups/default/full';
var CONTACTS_FEED = "https://www.google.com/m8/feeds/contacts/default/full";

// This is a hash of email addresses that are ALREADY in the users google
// contacts.  If a user already exists, then we want to avoid adding him as a
// duplicate contact from facebook.
var GOOGLE_CONTACTS_HASH = Object();

// There is a delicate order of what gets called and when, when interacting
// with the google contacts API.  By using a function call queue, we can easily
// shift/unshift/push the next necessary call, and make the calls in the right
// order.  The alternative is to use synchronous ajax, which I guess is OK
// too...  but this feels cooler.
var FUNCTION_QUEUE = [];
var REQUESTED_FRIENDS_TO_IMPORT = [];

function google_StartExportWithFriends(requestedFriendsToImport) {
  console.log("google_StartExportWithFriends");
  REQUESTED_FRIENDS_TO_IMPORT = requestedFriendsToImport;

  console.log(oauth.hasToken());
  FUNCTION_QUEUE.push(google_EnsureContactGroupExists);
  FUNCTION_QUEUE.push(google_GetGmailContacts);
  FUNCTION_QUEUE.push(google_StartExportingRequestedContacts);

  oauth.authorize(google_OAuthDidAuthorize);
}

function google_OAuthDidAuthorize() {
  // Start doing things in the function queue.
  google_doNextAction();
}

function google_doNextAction() {
  // Execute the next function in the funciton queue.
  if (FUNCTION_QUEUE.length) {
    var next_function_to_call = FUNCTION_QUEUE.shift();
    next_function_to_call();
  }
}

function google_CreateAtomEntry() {
  // Create and return the raw <atom:entry> element, with some default
  // attributes and children.

  var entry = document.createElementNS("http://www.w3.org/2005/Atom", "atom:entry");

  $(entry).attr("xmlns:atom", "http://www.w3.org/2005/Atom")
          .attr("xmlns:gd", 'http://schemas.google.com/g/2005')
          .attr("xmlns:gcontact", 'http://schemas.google.com/contact/2008');

  return entry;
}

function google_CreateContactGroup() {
  // Create the "Imported From Facebook" contact group, ensuring that the
  // "Imported From Facebook" group does not exist already.

  console.log("google_CreateContactGroup");

  var entry = google_CreateAtomEntry();
  // The below XML derived from:
  // http://code.google.com/apis/contacts/docs/3.0/developers_guide_protocol.html#CreatingGroups
  $(entry).append($("<atom:category/>").attr("scheme", "http://schemas.google.com/g/2005#kind")
                                       .attr("term", "http://schemas.google.com/contact/2008#group"));
  $(entry).append(
      $("<atom:title/>").attr("type", "text")
                        .text(CONTACT_GROUP_NAME));
  $(entry).append(
      $("<gd:extendedProperty/>").attr("name", "more info about the group")
          .append($("<info/>").text(
          "Exported using Facebook Doesnt Own My Friends (Chrome Extension)")));

  // Must do the following to get the <atom:entry> element as a string.  The
  // "div" root element will not be included, but is necessary to call html().
  var s = $("<div/>").append(entry).html();
  // Jquery doesn't give a damn about the case of the tags, making everything
  // lowercase.  We need to fix that, as google expects tags in the right case.
  s = s.replace(/extendedproperty/g, "extendedProperty");

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

  oauth.sendSignedRequest(GROUPS_FEED, google_OnCreateContactGroup, request);
}

function google_OnCreateContactGroup(text, xhr) {
  console.log("google_OnCreateContactGroup");
  var data = JSON.parse(text);
  console.log(data);
  google_SaveContactGroupHrefFromGroupObject(data.entry);

  // Don't need to do anything with the function queue.
  console.log(text);
  google_doNextAction();
}

function google_EnsureContactGroupExists() {
  console.log("google_EnsureContactGroupExists");
  // Get the entire groups list (since there is no search querying based on
  // exact group name) and see if we've created this group already.  If the
  // group exists, avoid creating it again (because gmail will happily create
  // another one with the same name).
  oauth.sendSignedRequest(GROUPS_FEED, google_OnGetContactGroups, {
    'parameters' : {
      'alt' : 'json',
    }
  });
}

function google_SaveContactGroupHrefFromGroupObject(group) {
  // The group argument is an object representing the (possibly newly created)
  // group.  It is an object (already parsed from JSON).

  CONTACT_GROUP_ID = group.id.$t;
}
      
function google_OnGetContactGroups(text, xhr) {
  console.log("google_OnGetContactGroups");

  // TODO: Assuming "text" is valid JSON at this point?  Is that wise?  Error
  // checking?
  var feed = JSON.parse(text);

  if ("entry" in feed.feed) {
    // Some entries (ie, groups) exist, see if one of them is our group.
    for (key in feed.feed.entry) {
      console.log(key);
      if (feed.feed.entry[key].title.$t == CONTACT_GROUP_NAME) {
        google_SaveContactGroupHrefFromGroupObject(feed.feed.entry[key]);
        return google_doNextAction();
      }
    }
  }

  // Group does not exist, need to create it before doing anything else.
  FUNCTION_QUEUE.unshift(google_CreateContactGroup);
  google_doNextAction();
}


function google_Logout() {
  oauth.clearTokens();
}


function google_OnGetContacts(text, xhr) {
  console.log("google_OnGetContacts");

  GOOGLE_CONTACTS_HASH = Object();
  var data = JSON.parse(text);
  console.log(data);
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
        GOOGLE_CONTACTS_HASH[email["address"]] = entry["id"]["$t"];
        //contact['emails'].push(email['address']);
      }
    }

    /*
    if (!contact['name']) {
      contact['name'] = contact['emails'][0] || "<Unknown>";
    }
    */
  }

  console.log(GOOGLE_CONTACTS_HASH);

  google_doNextAction();
}

function google_GetGmailContacts() {
  console.log("google_GetGmailContacts");

  oauth.sendSignedRequest(CONTACTS_FEED, google_OnGetContacts, {
    'parameters' : {
      'max-results' : 100000,
      'alt' : 'json'
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
}

function google_AddFriendToGoogleContacts(friend) {
  // This assumes that the contact group has already been created.

  var entry = google_CreateAtomEntry();

  // The below XML derived from:
  // http://code.google.com/apis/contacts/docs/3.0/developers_guide_protocol.html#Creating
  $(entry).append($("<atom:category/>").attr("scheme", "http://schemas.google.com/g/2005#kind")
                                       .attr("term", "http://schemas.google.com/contact/2008#contact"));

  // Add the right stuff for each known attribute of friend.  For additional
  // entries, add the right code below.  See reference at: 
  // http://code.google.com/apis/gdata/docs/2.0/elements.html
  //
  // For list of defined attributes that are set by the scraping script, look
  // at fb-exporter.js.
  var title = $("<title/>").attr("type", "text").text(friend.name);
  $(entry).append(title);
  var name = $("<gd:name/>")
          .append($("<gd:fullName/>").text(friend.name))
          //.append($("<gd:givenName/>").text("Oshalim"))
          //.append($("<gd:familyName/>").text("Jonathan"))
          ;
  $(entry).append(name);

  if (friend.email) {
    // Handle multiple emails.  The .email property is a list of defined
    // email.
    var primary_email_set = false;
    for (key in friend.email) {
      var gdemail = $("<gd:email/>").attr("address", friend.email[key]);
      gdemail.attr("displayName", friend.name);
      gdemail.attr("rel", "http://schemas.google.com/g/2005#home");
      if (!primary_email_set) {
        gdemail.attr("primary", "true");
        primary_email_set = true;
      }
      $(entry).append(gdemail);
    }
  }

  if (friend.aims) {
    for (key in friend.aims) {
      var gdim = $("<gd:im/>").attr("address", friend.aims[key])
                              .attr("rel", "http://schemas.google.com/g/2005#home");
      gdim.attr("protocol", "http://schemas.google.com/g/2005#AIM");
      $(entry).append(gdim);
    }
  }

  if (friend.gtalks) {
    for (key in friend.gtalks) {
      var gdim = $("<gd:im/>").attr("address", friend.gtalks[key])
                              .attr("rel", "http://schemas.google.com/g/2005#home");
      gdim.attr("protocol", "http://schemas.google.com/g/2005#GOOGLE_TALK");
      $(entry).append(gdim);
    }
  }

  if (friend.websites) {
    for (key in friend.websites) {
      var website = $("<gcontact:website/>")
                             .attr("label", "homepage")
                             .attr("href", friend.websites[key]);
      $(entry).append(website);
    }
  }

  if (friend.fb) {
    // The friend's FB page, direct website.
    var website = $("<gcontact:website/>")
                           .attr("label", "facebook profile")
                           .attr("href", friend.fb);
    $(entry).append(website);
  }

  // Finally, add the friend to the right group (the one we (possibly) created
  // above, that houses the facebook exports).
  var groupMembershipInfo = $("<gcontact:groupMembershipInfo/>")
                            .attr("deleted", 'false')
                            .attr("href", CONTACT_GROUP_ID);
  $(entry).append(groupMembershipInfo);

  // Must do the following to get the <atom:entry> element as a string.  The
  // "div" root element will not be included, but is necessary to call html().
  var s = $("<div/>").append(entry).html();

  // Jquery doesn't give a damn about the case of the tags, making everything
  // lowercase.  We need to fix that, as google expects tags in the right case.
  // This really sucks.
  s = s.replace(/gd:fullname/g, "gd:fullName");
  s = s.replace(/gcontact:groupmembershipinfo/g, "gcontact:groupMembershipInfo");

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

  console.log(s);
  oauth.sendSignedRequest(CONTACTS_FEED, google_OnAddContact, request, friend);
}

function google_OnAddContact(text, xhr, friend) {
  // This script runs in the context of background.html, so using
  // "worker_id" is valid.
  console.log(text);
  chrome.tabs.sendRequest(worker_id, {
      finishedProcessingFriend: true,
      friend: friend,
      success: 1,
      message: "Added to your Google Contacts!"
  });
}

function google_StartExportingRequestedContacts() {
  console.log("google_StartExportingRequestedContacts");

  // Prune out any friends that don't have any email addresses.  We use email
  // addresses to determine if a contact already exists in google contacts, so
  // friends with no emails are problematic.  Better to just not deal with
  // them.
  var friends_with_emails = [];
  $.each(REQUESTED_FRIENDS_TO_IMPORT, function(key, friend) {
    if (!friend.email || friend.email.length == 0) {
      // The friend does not have an email address listed.  Avoid adding him to
      // Google Contacts altogether.
      chrome.tabs.sendRequest(worker_id, {
          finishedProcessingFriend: true,
          friend: friend,
          success: 0,
          message: "Not added: Friend is missing at least one email address!"
      });
    } else {
      friends_with_emails.push(friend);
    }
  });

  // Keep a list of the friends that are requested for importation into Google
  // contacts that DON'T already exist there.  We determine non-duplicate
  // friends based on their email address already being in the Google contacts.
  var non_duplicate_friends_to_import = [];
  $.each(friends_with_emails, function(key, friend) {
    // See if the emails address for this friend matches one in the existing
    // google contacts.  If so, skip this friend.
    for (i in friend.email) {
      var email = friend.email[i];

      if (!GOOGLE_CONTACTS_HASH[email]) {
        non_duplicate_friends_to_import.push(friend);
        // Don't want to add the same friend twice, if this friend has another
        // email address, for example.
        break;
      }
    }
  });

  // The difference now between friends_with_emails and
  // non_duplicate_friends_to_import is the list of friends that we are NOT
  // adding because they already exist in google contacts.  We need to report
  // these back to the work tab as well.
  $.each(non_duplicate_friends_to_import, function(key, friend) {
    if ($.inArray(friend, friends_with_emails) != -1) {
      delete friends_with_emails[$.inArray(friend, friends_with_emails)];
    }
  });
  // friends_with_emails has now been pruned to remove all non-duplicate
  // emails.  The remaining friends_with_emails contains only duplicate friends
  // that we don't intend to add, so notify the work tab.
  $.each(friends_with_emails, function(key, friend) {
    chrome.tabs.sendRequest(worker_id, {
        finishedProcessingFriend: true,
        friend: friend,
        success: 0,
        message: "Not added: It looks like this friend is already in your Google Contacts!"
    });
  });

  // Now we're ready to add the remaining, non-duplicate friends to google
  // contacts.
  $.each(non_duplicate_friends_to_import, function(key, friend) {
    google_AddFriendToGoogleContacts(friend);
  });

  google_doNextAction();
}

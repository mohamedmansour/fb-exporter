// Communicate to both worlds, extension and website.
var exportEvent = document.createEvent('Event');
exportEvent.initEvent('friendExported', true, true);

// Main friend map which was retrieved by the website.
var friendsMap = {};    
    
// Just draw the export friends link on the top next to the other links.
renderExportFriendsLink();

// Listen on extension requests.
chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  if (request.startExportFriendData) {
    startExportFriendData();
  }
  else if (request.getFriendsMap) {
    sendResponse({data: friendsMap});
  }
});

// Listen on the real DOM requests to check if friend has been exported.
window.addEventListener('friendExported', function() {
  // Save the map to this content script world, so our extension can read it.
  var transferDOM = document.getElementById('transfer-dom-area');
  friendsMap = JSON.parse(transferDOM.innerText);

  // For testing, lets just view 2 users.
  var i = 0;
  var testMap = {};
  $.each(friendsMap, function(key, value) {
    if (i == 2) {
      return false;
    }
    testMap[key] = value;
    i++;
  });
  delete friendsMap;
  friendsMap = testMap;
  console.debug(friendsMap);
  
  // Clean up since we no longer need this.
  $(transferDOM).remove();
  
  // Lets start the process! Super!
  switchToWorkerTab();
});
  
/**
 * Switches back to the worker tab where you can see all your friends being
 * processed.
 */
function switchToWorkerTab() {
  // The extension will handle the case if the worker tab already exists.
  chrome.extension.sendRequest({switchToWorkerTab: 1}, function(response) {
    console.log('Returned from extension');
  });
}

/**
 * Creates a custom Facebook lookalike dialog. 
 * @param {Object} data A map with the following keys:
 *                      - id: The ID for this dialog.
 *                      - title: The title the appears on the header.
 *                      - message: The description of the dialog, appears middle.
 *                      - yes_text: The text for the yes button.
 *                      - yes_callback: The callback when yes clicked.
 *                      - cancel_callback: The callback when cancel clicked.
 * @returns {HTMLElement} The DOM of the dialog returned.
 */
function createFacebookDialog(data) {
   // Creates the confirm component.
   var lblConfirm = $('<label class="uiButton uiButtonLarge uiButtonConfirm">');   
   $('<input>', {
      type: 'button',
      val: data.yes_text,
      click: data.yes_callback
   }).appendTo(lblConfirm);
   
   // Creates the cancel component.
   var lblCancel = $('<label class="uiButton uiButtonLarge">');
   $('<input>', {
      type: 'button',
      val: 'Cancel',
      click: data.cancel_callback
   }).appendTo(lblCancel);
   
   // Wrap the buttons to a container.
   var dialogButtons = $('<div class="dialog_buttons clearfix">');
   lblConfirm.appendTo(dialogButtons);
   lblCancel.appendTo(dialogButtons);
   
   // Main contents for the dialog description.
   var dialogContent = $('<div class="dialog_content">');
   $('<div class="dialog_body">' +
     '  <form id="report_form" onsubmit="return false;">' +
     '    <div class="pam uiBoxWhite noborder">' +
     '      <div class="pbm">' +
     '        ' + data.message +
     '      </div>' +
     '    </div>' +
     '  </form>' +
     '</div>').appendTo(dialogContent);
   dialogButtons.appendTo(dialogContent);
   
   // Add the title to the the dialog and the contents as well.
   var dialog = document.createElement('div');
   $(dialog).addClass('pop_container_advanced')
            .attr('id', data.id)
            .css('position', 'absolute')
            .css("left", "25%")
            .css("right", "25%")
            .css("top", "20%")
            .css("zIndex", "999999");
   var dialogPopup = $('<div class="pop_content" id="pop_content">');
   $('<h2 class="dialog_title"><span>' + data.title + '</span></h2>').appendTo(dialogPopup);
   dialogContent.appendTo(dialogPopup);
   dialogPopup.appendTo(dialog);
   return dialog;
}

/**
 * To transport JavaScript data from Facebook, it is faster and better to transfer
 * the internal map Facebook maintains. To do that, we create a transfer dom area
 * to the page so we dump the FriendSearchPane and then store it in the background
 * page right afterwards.
 */
function exportFacebookContacts() {
  // JS script injection to the facebook's World.
  var postFriendMap = function() {
    // Use events to notify the content script. Replicate the event the content
    // script has, so we can pass this event to that world.
    var exportEvent = document.createEvent('Event');
    exportEvent.initEvent('friendExported', true, true);
    
    // Create a transfer node DOM, since that is the only way two worlds can
    // communicate with each other.
    var transferDOM = document.getElementById('transfer-dom-area');
    transferDOM.innerText = JSON.stringify(FriendSearchPane._data);
    
    // Inform our content script that we have received the object from Facebook.
    window.dispatchEvent(exportEvent);
  };
  
  // Create a dummy textarea DOM.
  var transferDOM = document.createElement('div');
  $(transferDOM).attr('id', 'transfer-dom-area')
                .hide()
                .appendTo($(document.body));
  
  // Start injecting the JS script.
  var script = document.createElement('script');
  script.appendChild(document.createTextNode('(' + postFriendMap + ')();'));
  document.body.appendChild(script);  
}
  
/**
 * To make sure the user wants to start exporting, we need to prompt her to
 * see if it's OK to go to the right page (she might have some input in an
 * input field that is not saved, etc).
 */
function goToFriendPageAndStart() {
  // See if we are at the right page to start.  We need to be at the /friends/*
  // location, to get access to the list of friends. Any other page won't do.
  if (document.location.pathname.match('^/friends/edit') && document.location.search == 0) {
    exportFacebookContacts();
  }
  else {     
    $(document.body).append(createFacebookDialog({
      id: 'fb-exporter-redirect',
      title: 'Redirection needed',
      message: 'First, you need to go to your friends page, do you want us to redirect you to it?',
      yes_text: 'Redirect now',
      yes_callback: (function() {
        $('#fb-exporter-redirect').remove();
        switchToWorkerTab();
        window.location = 'http://www.facebook.com/friends/edit';
      }),
      cancel_callback: (function() {
        $('#fb-exporter-redirect').remove();
      })
    }));
  }
}

/**
 * Adds a export friends link to the top of the worker tab.
 */
function renderExportFriendsLink() {
  // Paint the Export friends to the top of the page.
  var exportFriendsLink = $('#pageNav a:contains("Home")').parent().clone();
  $('a', exportFriendsLink)
      .attr('id', 'export-friends-link')
      .attr('href', 'javascript:void(0);')
      .text('Export friends!')
      .css('color', 'white')
      .click(goToFriendPageAndStart);
  exportFriendsLink.appendTo($('#pageNav a:contains("Home")').parent());
}

/**
 * When the iframe has been loaded, we wait for N seconds (3s default), 
 * Once frame is loaded, we extract the information, then pass the data back
 * to the background page for post processing.
 *
 * TODO(mohamed): The email usually gets rendered as an image captcha, I believe
 *                is purposely there because we are scraping our own pages to 
 *                automatically sync our friends contact information. Perhaps
 *                there is such limitation on how many friend pages we can view
 *                This needs to be handled in a way, to OCR that image, and 
 *                store it. For now, we need to inform the user an error occured
 *                because Facebook decided to convert their email address to
 *                an unreadable image for machines to quickly analyse and store.
 */
function friendInfoIframeLoaded() {
  var iframe = this;
  
  // We can't access the iframe elements directly, because they probably have
  // not loaded yet.  The contact information fields are appended dynamically.
  // Instead, we use setTimeout to give all the pagelets a chance to load.
  setTimeout(function(iframe) {
    var friend_id = iframe.src.substring(iframe.src.lastIndexOf('#') + 1)
    var friend_name = friendsMap[friend_id].text;
    
    // NOTE TO FUTURE SELF: If this extension breaks, it's probably because the
    // following lines no longer work.  Namely, the fragile selector access
    // being done below to get at the corresponding fields might need to be
    // updated.  Look at the actual FB page in question to make the right
    // fixes.  PS: Who wins the next 20 world series??
    //
    // To gather additional friend information, add the right selector here.
    var email = $('li', $('th.label:contains("Email")', $(iframe.contentDocument)).parent());
    var aims = $('td', $('th.label:contains("AIM")', $(iframe.contentDocument)).parent());
    var websites = $('li', $('th.label:contains("Website")', $(iframe.contentDocument)).parent());
    var fb = $('td', $('th.label:contains("Facebook")', $(iframe.contentDocument)).parent());
    var gtalks = $('td', $('th.label:contains("Google Talk")', $(iframe.contentDocument)).parent());

    // Storage for post processing.
    var friend = {};
    friend.id = friend_id;
    friend.name = friend_name;
    friend.email = email.map(function() {
      return $(this).text();
    }).get();
    friend.aims = aims.map(function() {
      return $(this).text();
    }).get();
    friend.websites = websites.map(function() {
      return $(this).text();
    }).get();
    friend.fb = fb.text();
    friend.gtalks = gtalks.map(function() {
      return $(this).text();
    }).get();

    // Relay the information to the background page so we could deal with 
    chrome.extension.sendRequest({relayInfoForFriend: friend});

    // Clean up iframe. All extraction successful.
    $(iframe).remove();
  }, 3000, this);
}

/**
 * Start exporting friend data, make sure we delay loading each friend, that way
 * Facebook wont block us since we are trying to view our friends.
 */
function startExportFriendData() {
  var i = 0;
  // Iterate through each friend by key[value]. 
  $.each(friendsMap, function(key, value) {
    // Figure out the proper info page, this makes sure to support both
    // profile name pages with (unique names) or just profile id pages
    // (numbers). As well, append the ID so we can uniquely identify each page
    // request with their ID being fetched..
    var href = 'http://www.facebook.com' + value.path;
    href.match('\\?') ? href += '&' : href += '?';
    href += 'v=info#' + key;

    // Delay load each friend.
    setTimeout(function() {
      var iframe = document.createElement('iframe');
      $(iframe).attr('src', href).attr('class', 'fb-exporter');
      $(document.body).prepend(iframe);
      $(iframe).load(friendInfoIframeLoaded);
    }, i * 11000 + Math.random() * 1000);

    i++;
  });
}